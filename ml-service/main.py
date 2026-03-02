from typing import List, Optional

from fastapi import FastAPI
from pydantic import BaseModel

from graph_analysis import (
    detect_circular_transactions,
    detect_dormant_activation,
    detect_rapid_layering,
    detect_round_tripping,
    detect_structuring,
    run_all_detections,
)

app = FastAPI(title="MoneyTrail AI - ML Service")


class TransactionInput(BaseModel):
    transaction_id: str
    account_id: str
    timestamp: str
    amount: float
    currency: str
    channel: str
    txn_type: str
    merchant: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    description: Optional[str] = None
    is_fraud: Optional[bool] = None
    fraud_scenario: Optional[str] = None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ml-service"}


def _to_dict_list(items: Optional[List[TransactionInput]]) -> Optional[List[dict]]:
    return [i.model_dump() for i in items] if items else None


@app.get("/fraud/circular-transactions")
async def fraud_circular_transactions():
    """Detect circular money flows: A -> B -> C -> A."""
    return detect_circular_transactions(None)


@app.get("/fraud/rapid-layering")
async def fraud_rapid_layering():
    """Detect rapid layering: money moving through many accounts in short time."""
    return detect_rapid_layering(None)


@app.get("/fraud/structuring")
async def fraud_structuring():
    """Detect structuring: multiple transactions just below reporting threshold."""
    return detect_structuring(None)


@app.get("/fraud/dormant-activation")
async def fraud_dormant_activation():
    """Detect dormant account activation: no activity for long period, then sudden activity."""
    return detect_dormant_activation(None)


@app.get("/fraud/round-tripping")
async def fraud_round_tripping():
    """Detect round tripping: money flows A -> B -> ... -> A (returns to origin)."""
    return detect_round_tripping(None)


@app.get("/fraud/all")
async def fraud_all():
    """Run all fraud detection algorithms."""
    return run_all_detections()


@app.post("/fraud/analyze")
async def fraud_analyze(transactions: List[TransactionInput]):
    """Run all fraud detections on provided transaction data."""
    data = _to_dict_list(transactions)
    return run_all_detections(transactions=data)

