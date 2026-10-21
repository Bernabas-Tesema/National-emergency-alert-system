# Task: triage

Classify one incident report (an agency case or a citizen SOS) and rate how urgent it is for INSA staff.

category: one of flood, fire, disease, security, missing_person, weather, accident, other.
category_given is the sender's hint, not a fact. Correct it when the text clearly shows another category.

severity: how fast and how widely people could be harmed if nobody acts.
- low: advisory or minor event, no immediate danger.
- medium: possible danger, there is time to prepare or verify.
- high: people are likely to be harmed soon, or already are, in a limited area.
- critical: immediate threat to life, a large area or many people, evacuation, or armed violence.

suggested_severity is the sender's hint (information, warning, critical). Disagree when the text supports it, and say why in reasons.
When life safety is involved, being too cautious is better than being too relaxed: do not rate a credible, life-threatening report below high.
If the report is thin, vague or contradicts itself, lower confidence and list what is missing in missing_info (at most 3 items).

summary: at most 2 sentences, plain language, only facts from the report.
reasons: 1 to 5 short points.

```json
{
  "category": "flood",
  "severity": "critical",
  "confidence": 0.85,
  "summary": "Heavy rain has raised river levels and water is expected to enter low-lying homes within two hours.",
  "reasons": ["Source is the meteorological institute and reports a rising river level", "Residents of low-lying streets are at immediate risk"],
  "missing_info": ["Exact river gauge reading"]
}
```
