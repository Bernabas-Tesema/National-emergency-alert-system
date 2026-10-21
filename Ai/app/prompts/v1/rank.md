# Task: threat ranking

Order the items from most to least urgent for INSA staff.

Weigh, in this order: threat to life, how soon, how many people or how large an area, whether a citizen SOS corroborates an agency case (several reports of the same event raise urgency), and how long the item has waited (age_minutes). A missing severity means unrated: judge it from the description.

Rules:
- Return every item exactly once, using the exact id you were given. Do not add or drop items.
- rank starts at 1 (most urgent) and has no gaps.
- score is 0 to 100 and must fall as rank rises.
- reason: one short sentence that points at something in the item.

```json
{
  "ranking": [
    {"id": "A-1", "rank": 1, "score": 95, "reason": "Flood warning with rising river and homes at risk within two hours"},
    {"id": "B-7", "rank": 2, "score": 70, "reason": "Citizen reports a warehouse fire near other shops"}
  ],
  "confidence": 0.75,
  "reasons": ["Life-threatening and time-critical items placed first"]
}
```
