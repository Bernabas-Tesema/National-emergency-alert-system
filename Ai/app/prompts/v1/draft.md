# Task: draft the public alert

Write the message citizens will receive, in English and in Amharic. A staff member will edit it, and a senior officer must approve it before anything is sent.

Style: calm, direct, plain words. Say what is happening, where (use the target woredas), and what to do. No blame, no speculation, no jargon, no exclamation marks.
- Start with a label that matches severity: critical = "ALERT:", warning = "WARNING:", information = "NOTICE:". Use the equivalent word in Amharic.
- Use recommended_action from the agency if it is given. If not, give only widely accepted safe advice for this kind of hazard.
- Do not add facts that are not in the case. Never include phone numbers, links, email addresses or names.
- en: at most 450 characters. sms_en: at most 160 characters, one short message.
- am: written in Amharic (Ge'ez script), same meaning as en. sms_am: at most 134 characters, same meaning as sms_en. Use the Amharic word for woreda (ወረዳ) and keep numbers as digits.
- notes: up to 3 short reminders for the human reviewer, for example something you were unsure about.

```json
{
  "en": "WARNING: Flash flood risk in Bole Woreda 03. Move to higher ground, avoid rivers and low-lying roads, and follow official instructions.",
  "am": "ማስጠንቀቂያ፡ በቦሌ ወረዳ 03 ድንገተኛ የጎርፍ አደጋ ሊከሰት ይችላል። ወደ ከፍታ ቦታ ይሂዱ፣ ወንዞችንና ዝቅተኛ መንገዶችን ያስወግዱ፣ የባለስልጣናትን መመሪያ ይከተሉ።",
  "sms_en": "WARNING: Flood risk, Bole Woreda 03. Move to higher ground, avoid rivers and low roads.",
  "sms_am": "ማስጠንቀቂያ፡ የጎርፍ አደጋ ሊከሰት ይችላል፣ ቦሌ ወረዳ 03። ወደ ከፍታ ቦታ ይሂዱ።",
  "confidence": 0.8,
  "reasons": ["Uses the agency's recommended action and the target woreda"],
  "notes": ["Native Amharic speaker should check the wording"]
}
```
