"""
NetworkX-based fraud detection for Indian banking transactions.
Detects: circular transactions, rapid layering, structuring,
dormant account activation, and round tripping.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import networkx as nx


# Indian reporting threshold (e.g., cash transaction reporting)
STRUCTURING_THRESHOLD = 50_000.0
DORMANT_DAYS = 60
RAPID_LAYERING_MINUTES = 30
RAPID_LAYERING_MIN_HOPS = 3


def _parse_ts(ts: str) -> datetime:
    """Parse ISO timestamp string."""
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def _load_transactions(path: str) -> List[Dict[str, Any]]:
    """Load transactions from JSON file."""
    p = Path(path)
    if not p.is_absolute():
        p = Path(__file__).resolve().parent.parent / path
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def _build_transfer_graph(
    transactions: List[Dict[str, Any]],
) -> Tuple[nx.DiGraph, Dict[Tuple[str, str], List[Dict]]]:
    """
    Build directed graph from transactions.
    Nodes: account_ids, MERCHANT:name for merchant payments.
    Edges: (source, target) with amount and timestamp.
    Infer counterparty by matching DEBIT/CREDIT pairs (same amount, within time window).
    """
    G = nx.DiGraph()
    edge_txns: Dict[Tuple[str, str], List[Dict]] = {}

    transfer_channels = {"UPI", "NEFT", "IMPS"}
    time_window = timedelta(minutes=5)

    debits = [
        t
        for t in transactions
        if t["txn_type"] == "DEBIT"
        and t["channel"] in transfer_channels
        and t.get("description") in ("Fund transfer", "High value UPI transfer to unknown beneficiary", "High value IMPS transfer to new account")
    ]
    credits = [
        t
        for t in transactions
        if t["txn_type"] == "CREDIT"
        and t["channel"] in transfer_channels
        and t.get("description") in ("Fund transfer", None)
    ]

    used_credits = set()

    for d in debits:
        src = d["account_id"]
        amount = d["amount"]
        ts_d = _parse_ts(d["timestamp"])

        # Try to match with a CREDIT (same amount, within time window)
        tgt = None
        for i, c in enumerate(credits):
            if i in used_credits:
                continue
            if abs(c["amount"] - amount) < 0.01:
                ts_c = _parse_ts(c["timestamp"])
                if abs((ts_c - ts_d).total_seconds()) < time_window.total_seconds():
                    tgt = c["account_id"]
                    used_credits.add(i)
                    break

        if tgt is None:
            tgt = f"UNKNOWN_{d['transaction_id']}"

        G.add_edge(src, tgt, amount=amount, timestamp=ts_d.isoformat(), txn_id=d["transaction_id"])
        key = (src, tgt)
        if key not in edge_txns:
            edge_txns[key] = []
        edge_txns[key].append(d)

    # Add merchant payment edges (DEBIT to merchant)
    for t in transactions:
        if t["txn_type"] == "DEBIT" and t.get("merchant"):
            src = t["account_id"]
            tgt = f"MERCHANT:{t['merchant']}"
            G.add_edge(
                src,
                tgt,
                amount=t["amount"],
                timestamp=_parse_ts(t["timestamp"]).isoformat(),
                txn_id=t["transaction_id"],
            )
            key = (src, tgt)
            if key not in edge_txns:
                edge_txns[key] = []
            edge_txns[key].append(t)

    return G, edge_txns


def _get_account_activity(transactions: List[Dict]) -> Dict[str, List[datetime]]:
    """Map account_id -> sorted list of transaction timestamps."""
    by_account: Dict[str, List[datetime]] = {}
    for t in transactions:
        acc = t["account_id"]
        if acc not in by_account:
            by_account[acc] = []
        by_account[acc].append(_parse_ts(t["timestamp"]))
    for acc in by_account:
        by_account[acc].sort()
    return by_account


def detect_circular_transactions(
    transactions: Optional[List[Dict[str, Any]]] = None,
    data_path: str = "transactions.json",
) -> Dict[str, Any]:
    """
    Detect circular money flows: A -> B -> C -> A (or longer cycles).
    """
    if transactions is None:
        transactions = _load_transactions(data_path)
    G, _ = _build_transfer_graph(transactions)
    cycles = list(nx.simple_cycles(G))
    # Filter to account-only cycles (exclude MERCHANT nodes)
    account_cycles = [
        c for c in cycles if all(not n.startswith("MERCHANT:") and not n.startswith("UNKNOWN_") for n in c)
    ]
    return {
        "detected": len(account_cycles) > 0,
        "cycle_count": len(account_cycles),
        "cycles": [
            {"path": c, "length": len(c)}
            for c in account_cycles[:20]
        ],
    }


def detect_rapid_layering(
    transactions: Optional[List[Dict[str, Any]]] = None,
    data_path: str = "transactions.json",
    time_window_minutes: int = RAPID_LAYERING_MINUTES,
    min_hops: int = RAPID_LAYERING_MIN_HOPS,
) -> Dict[str, Any]:
    """
    Detect rapid layering: money moving through many accounts in short time.
    """
    if transactions is None:
        transactions = _load_transactions(data_path)
    G, edge_txns = _build_transfer_graph(transactions)
    window = timedelta(minutes=time_window_minutes)
    suspicious_paths: List[Dict] = []

    for src in G.nodes():
        if src.startswith("MERCHANT:") or src.startswith("UNKNOWN_"):
            continue
        try:
            for tgt in G.nodes():
                if tgt.startswith("MERCHANT:") or tgt.startswith("UNKNOWN_"):
                    continue
                if src == tgt:
                    continue
                paths = list(nx.all_simple_paths(G, src, tgt, cutoff=min_hops + 2))
                for path in paths:
                    if len(path) < min_hops:
                        continue
                    # Check if all edges have timestamps within window
                    edges = list(zip(path[:-1], path[1:]))
                    timestamps = []
                    for u, v in edges:
                        if G.has_edge(u, v):
                            ts = G[u][v].get("timestamp")
                            if ts:
                                timestamps.append(_parse_ts(ts))
                    if len(timestamps) < 2:
                        continue
                    if max(timestamps) - min(timestamps) <= window:
                        suspicious_paths.append({
                            "path": path,
                            "hops": len(path) - 1,
                            "time_span_minutes": (max(timestamps) - min(timestamps)).total_seconds() / 60,
                        })
        except nx.NetworkXNoPath:
            pass

    return {
        "detected": len(suspicious_paths) > 0,
        "suspicious_path_count": len(suspicious_paths),
        "paths": suspicious_paths[:20],
    }


def detect_structuring(
    transactions: Optional[List[Dict[str, Any]]] = None,
    data_path: str = "transactions.json",
    threshold: float = STRUCTURING_THRESHOLD,
) -> Dict[str, Any]:
    """
    Detect structuring: multiple transactions just below reporting threshold.
    """
    if transactions is None:
        transactions = _load_transactions(data_path)
    by_account: Dict[str, List[Dict]] = {}
    for t in transactions:
        if t["txn_type"] != "DEBIT":
            continue
        acc = t["account_id"]
        if acc not in by_account:
            by_account[acc] = []
        by_account[acc].append(t)

    suspicious: List[Dict] = []
    for acc, txns in by_account.items():
        below = [t for t in txns if 0 < t["amount"] < threshold]
        if len(below) >= 3:
            total = sum(t["amount"] for t in below)
            if total >= threshold:
                suspicious.append({
                    "account_id": acc,
                    "transaction_count": len(below),
                    "total_amount": round(total, 2),
                    "threshold": threshold,
                    "transactions": [
                        {"id": t["transaction_id"], "amount": t["amount"]}
                        for t in below[:10]
                    ],
                })

    return {
        "detected": len(suspicious) > 0,
        "suspicious_account_count": len(suspicious),
        "accounts": suspicious[:20],
    }


def detect_dormant_activation(
    transactions: Optional[List[Dict[str, Any]]] = None,
    data_path: str = "transactions.json",
    dormant_days: int = DORMANT_DAYS,
) -> Dict[str, Any]:
    """
    Detect dormant account activation: no activity for long period, then sudden activity.
    """
    if transactions is None:
        transactions = _load_transactions(data_path)
    by_account = _get_account_activity(transactions)
    suspicious: List[Dict] = []

    for acc, timestamps in by_account.items():
        if len(timestamps) < 2:
            continue
        for i in range(1, len(timestamps)):
            gap = (timestamps[i] - timestamps[i - 1]).days
            if gap >= dormant_days:
                suspicious.append({
                    "account_id": acc,
                    "dormant_days": gap,
                    "last_activity_before": timestamps[i - 1].isoformat(),
                    "reactivation_at": timestamps[i].isoformat(),
                })
                break

    return {
        "detected": len(suspicious) > 0,
        "suspicious_account_count": len(suspicious),
        "accounts": suspicious[:20],
    }


def detect_round_tripping(
    transactions: Optional[List[Dict[str, Any]]] = None,
    data_path: str = "transactions.json",
) -> Dict[str, Any]:
    """
    Detect round tripping: money flows A -> B -> ... -> A (returns to origin).
    Uses cycle detection; round trips are cycles through account nodes.
    """
    if transactions is None:
        transactions = _load_transactions(data_path)
    G, _ = _build_transfer_graph(transactions)
    cycles = list(nx.simple_cycles(G))
    round_trips = [
        {"path": c, "length": len(c)}
        for c in cycles
        if all(not n.startswith("MERCHANT:") and not n.startswith("UNKNOWN_") for n in c)
    ]
    return {
        "detected": len(round_trips) > 0,
        "round_trip_count": len(round_trips),
        "round_trips": round_trips[:20],
    }


def run_all_detections(
    transactions: Optional[List[Dict[str, Any]]] = None,
    data_path: str = "transactions.json",
) -> Dict[str, Any]:
    """Run all fraud detection algorithms and return combined results."""
    if transactions is None:
        transactions = _load_transactions(data_path)

    return {
        "circular_transactions": detect_circular_transactions(transactions),
        "rapid_layering": detect_rapid_layering(transactions),
        "structuring": detect_structuring(transactions),
        "dormant_activation": detect_dormant_activation(transactions),
        "round_tripping": detect_round_tripping(transactions),
    }
