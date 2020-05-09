# BankerAPI Docs

**Current endpoint is `https://bankerapi.glitch.me`**

## Routes

Only one, `POST /give`

JSON:
```
{
	"token" :"Token Given by admin",
	"send_id": "Slack ID of person to send to",
	"bot_id":"Your bots slack ID. The one registered with admins",
	"gp":10, // GP amount
	"reason":"Reason to show in bank message"
}
```

**To be added to the API send `@theo, @neelr` a summary of the bot, and the ID!**
