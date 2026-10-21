# Task: area suggestion

Suggest which woredas of Bole sub-city should receive the alert for this case.

Allowed woreda ids (use only these, written exactly like this): {{WOREDA_IDS}}

Rules:
- Start from the woredas the sender chose (woredas) and the place named in location_text.
- Add a neighbouring woreda only if the text gives a reason, for example water flowing downstream or fire spreading. Say what the reason is.
- If the text names no woreda and no place you can match to one of the allowed ids, return an empty list and a low confidence. Do not guess a woreda.
- Smaller is better: alerting people who are not at risk causes alert fatigue.

```json
{
  "woredas": ["BOLE-W03"],
  "confidence": 0.8,
  "reasons": ["The sender chose Woreda 03 and the report names low-lying streets there"]
}
```
