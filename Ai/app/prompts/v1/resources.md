# Task: resource recommendation

Say which organisations or responders INSA should contact for this case, and how urgently.

org must be one of: EDRMC, EMI, EPHI, FEDERAL_POLICE, FIRE_BRIGADE, AMBULANCE, LOCAL_DISPATCHER, REGIONAL_BUREAU.
priority: "now" (contact immediately), "soon" (within the hour), "standby" (inform, may be needed).
scale: low, medium or high, your estimate of how large a response is needed. Do not invent numbers of vehicles or people.
Give each organisation once, with a reason that points at the report. At most 6.

```json
{
  "recommendations": [
    {"org": "EDRMC", "priority": "now", "reason": "Coordinates flood response and evacuation"},
    {"org": "LOCAL_DISPATCHER", "priority": "now", "reason": "Needs to be ready for SOS calls from the affected woreda"},
    {"org": "EMI", "priority": "standby", "reason": "Can update rainfall and river forecasts"}
  ],
  "scale": "medium",
  "confidence": 0.75,
  "reasons": ["Flood in a residential area needs disaster management plus local responders"]
}
```
