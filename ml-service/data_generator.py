import json
import random
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import List, Optional


random.seed(42)


@dataclass
class Transaction:
    transaction_id: str
    account_id: str
    timestamp: str
    amount: float
    currency: str
    channel: str
    txn_type: str
    merchant: Optional[str]
    city: Optional[str]
    state: Optional[str]
    description: Optional[str]
    is_fraud: bool
    fraud_scenario: Optional[str]


NUM_ACCOUNTS = 100
NUM_TRANSACTIONS = 1000
NUM_FRAUD = 5
BASE_DATE = datetime.now()


ACCOUNT_CITIES = [
    ("Mumbai", "Maharashtra"),
    ("Delhi", "Delhi"),
    ("Bengaluru", "Karnataka"),
    ("Chennai", "Tamil Nadu"),
    ("Hyderabad", "Telangana"),
    ("Pune", "Maharashtra"),
    ("Kolkata", "West Bengal"),
    ("Ahmedabad", "Gujarat"),
    ("Jaipur", "Rajasthan"),
    ("Lucknow", "Uttar Pradesh"),
]

MERCHANTS = [
    "Amazon India",
    "Flipkart",
    "Swiggy",
    "Zomato",
    "IRCTC",
    "Uber India",
    "Ola Cabs",
    "Big Bazaar",
    "Reliance Retail",
    "Paytm Wallet",
]

CHANNELS = ["UPI", "NEFT", "IMPS", "ATM", "POS", "NET_BANKING"]

TXN_TYPES = [
    "DEBIT",
    "CREDIT",
]


def generate_account_ids(num_accounts: int) -> List[str]:
    # Simple Indian-style account numbers
    return [f"SBIN000{1000 + i}" for i in range(num_accounts)]


def random_timestamp() -> datetime:
    # Spread transactions over the last 90 days
    days_offset = random.randint(0, 89)
    seconds_offset = random.randint(0, 24 * 60 * 60 - 1)
    return BASE_DATE - timedelta(days=days_offset, seconds=seconds_offset)


def random_amount(mean: float = 2500.0, std_dev: float = 1500.0) -> float:
    amount = random.gauss(mean, std_dev)
    amount = max(50.0, min(amount, 150000.0))
    return round(amount, 2)


def make_normal_transaction(transaction_id: int, account_id: str) -> Transaction:
    city, state = random.choice(ACCOUNT_CITIES)
    channel = random.choice(CHANNELS)
    txn_type = random.choice(TXN_TYPES)

    # Different ranges for credits vs debits
    if txn_type == "CREDIT":
        amount = random_amount(mean=20000.0, std_dev=10000.0)
    else:
        amount = random_amount(mean=2000.0, std_dev=1000.0)

    merchant = None
    description = None
    if channel in {"UPI", "POS", "NET_BANKING"} and txn_type == "DEBIT":
        merchant = random.choice(MERCHANTS)
        description = f"Payment to {merchant}"
    elif channel in {"NEFT", "IMPS"}:
        description = "Fund transfer"
    elif channel == "ATM":
        description = "ATM cash withdrawal"

    ts = random_timestamp()

    return Transaction(
        transaction_id=f"TXN{transaction_id:06d}",
        account_id=account_id,
        timestamp=ts.isoformat(timespec="seconds"),
        amount=amount,
        currency="INR",
        channel=channel,
        txn_type=txn_type,
        merchant=merchant,
        city=city,
        state=state,
        description=description,
        is_fraud=False,
        fraud_scenario=None,
    )


def make_fraud_scenarios(
    start_transaction_id: int, account_ids: List[str]
) -> List[Transaction]:
    """
    Create exactly 5 clearly-labelled but realistic fraud transactions.
    Each scenario is a single fraudulent transaction with a distinct pattern.
    """
    fraud_transactions: List[Transaction] = []

    # Scenario 1: Large UPI transfer at odd hours from a usually low-activity account
    acc1 = random.choice(account_ids)
    ts1 = (BASE_DATE - timedelta(days=random.randint(1, 5))).replace(hour=2, minute=37)
    fraud_transactions.append(
        Transaction(
            transaction_id=f"TXN{start_transaction_id:06d}",
            account_id=acc1,
            timestamp=ts1.isoformat(timespec="seconds"),
            amount=95000.0,
            currency="INR",
            channel="UPI",
            txn_type="DEBIT",
            merchant="Unknown UPI ID",
            city="Mumbai",
            state="Maharashtra",
            description="High value UPI transfer to unknown beneficiary",
            is_fraud=True,
            fraud_scenario="LARGE_NIGHT_UPI_TRANSFER",
        )
    )

    # Scenario 2: ATM withdrawal in a distant city within hours of local use
    acc2 = random.choice(account_ids)
    ts2 = (BASE_DATE - timedelta(days=random.randint(2, 10))).replace(
        hour=5, minute=12
    )
    fraud_transactions.append(
        Transaction(
            transaction_id=f"TXN{start_transaction_id + 1:06d}",
            account_id=acc2,
            timestamp=ts2.isoformat(timespec="seconds"),
            amount=40000.0,
            currency="INR",
            channel="ATM",
            txn_type="DEBIT",
            merchant=None,
            city="Kolkata",
            state="West Bengal",
            description="High value ATM withdrawal from non-home location",
            is_fraud=True,
            fraud_scenario="DISTANT_CITY_ATM_WITHDRAWAL",
        )
    )

    # Scenario 3: Card-not-present e-commerce purchase with unusually high amount
    acc3 = random.choice(account_ids)
    ts3 = (BASE_DATE - timedelta(days=random.randint(3, 15))).replace(
        hour=23, minute=5
    )
    fraud_transactions.append(
        Transaction(
            transaction_id=f"TXN{start_transaction_id + 2:06d}",
            account_id=acc3,
            timestamp=ts3.isoformat(timespec="seconds"),
            amount=120000.0,
            currency="INR",
            channel="NET_BANKING",
            txn_type="DEBIT",
            merchant="International Electronics Store",
            city="Bengaluru",
            state="Karnataka",
            description="Card-not-present international purchase",
            is_fraud=True,
            fraud_scenario="CARD_NOT_PRESENT_INTERNATIONAL",
        )
    )

    # Scenario 4: Mule account – sudden large inbound followed by immediate outbound
    # Only outbound is marked as fraud here; inbound will look like a normal credit.
    acc4 = random.choice(account_ids)
    ts4 = (BASE_DATE - timedelta(days=random.randint(5, 20))).replace(
        hour=11, minute=20
    )
    fraud_transactions.append(
        Transaction(
            transaction_id=f"TXN{start_transaction_id + 3:06d}",
            account_id=acc4,
            timestamp=ts4.isoformat(timespec="seconds"),
            amount=88000.0,
            currency="INR",
            channel="IMPS",
            txn_type="DEBIT",
            merchant=None,
            city="Hyderabad",
            state="Telangana",
            description="High value IMPS transfer to new account",
            is_fraud=True,
            fraud_scenario="MULE_ACCOUNT_LARGE_OUTBOUND",
        )
    )

    # Scenario 5: Multiple small UPI debits towards a new merchant (smurfing)
    # Represented as a single flagged transaction with typical small-ticket amount.
    acc5 = random.choice(account_ids)
    ts5 = (BASE_DATE - timedelta(days=random.randint(1, 7))).replace(
        hour=9, minute=55
    )
    fraud_transactions.append(
        Transaction(
            transaction_id=f"TXN{start_transaction_id + 4:06d}",
            account_id=acc5,
            timestamp=ts5.isoformat(timespec="seconds"),
            amount=2499.0,
            currency="INR",
            channel="UPI",
            txn_type="DEBIT",
            merchant="New Online Gaming Merchant",
            city="Delhi",
            state="Delhi",
            description="Series of small UPI debits to new merchant",
            is_fraud=True,
            fraud_scenario="MULTIPLE_SMALL_UPI_SMURFING",
        )
    )

    return fraud_transactions


def generate_transactions() -> List[Transaction]:
    account_ids = generate_account_ids(NUM_ACCOUNTS)

    transactions: List[Transaction] = []

    # First, generate normal transactions
    for i in range(NUM_TRANSACTIONS - NUM_FRAUD):
        account_id = random.choice(account_ids)
        transactions.append(make_normal_transaction(i + 1, account_id))

    # Then generate exactly NUM_FRAUD fraud scenarios
    fraud_start_id = NUM_TRANSACTIONS - NUM_FRAUD + 1
    fraud_transactions = make_fraud_scenarios(fraud_start_id, account_ids)

    # Combine and shuffle so frauds are hidden among normals
    all_transactions = transactions + fraud_transactions
    random.shuffle(all_transactions)

    # Reassign transaction_ids to be sequential after shuffling for a clean dataset
    for idx, txn in enumerate(all_transactions, start=1):
        txn.transaction_id = f"TXN{idx:06d}"

    # Sanity check: ensure exactly NUM_FRAUD labelled frauds
    fraud_count = sum(1 for t in all_transactions if t.is_fraud)
    assert fraud_count == NUM_FRAUD, f"Expected {NUM_FRAUD} frauds, found {fraud_count}"

    return all_transactions


def save_transactions_to_json(transactions: List[Transaction], path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump([asdict(t) for t in transactions], f, indent=2, ensure_ascii=False)


def main() -> None:
    transactions = generate_transactions()
    output_path = "transactions.json"
    save_transactions_to_json(transactions, output_path)
    print(f"Wrote {len(transactions)} transactions to {output_path}")


if __name__ == "__main__":
    main()

