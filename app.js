require("dotenv").config();
var express = require("express");
var app = express();
var axios = require("axios");
var qs = require("qs");
app.use(express.json());
var Airtable = require('airtable');
var base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(process.env.AIRTABLE_BASE);

var slack = (channel,text) => {
    axios.post('https://slack.com/api/chat.postMessage',
        qs.stringify({
            token: process.env.SLACK_TOKEN,
            channel: channel,
            text: text
        })
    );
}
var send = (gp, id, reason, bot_id) => {
    return new Promise((res, rej) => {
        var bot,user;
        base("bank").select({ view: "Grid view" ,filterByFormula:"OR({User} = '"+bot_id+"', {User} = '"+id+"')"})
            .eachPage((records, fetch) => {
                records.forEach((record) => {
                    console.log(record.get("User"))
                    if (bot_id == record.get("User")) {
                        bot = { id: record.id, gp: record.get("Balance") };
                    } else if (id == record.get("User")) {
                        user = { id: record.id, gp: record.get("Balance") };
                    }
     
                },(err) => console.log(err))
                fetch();
            }, () => {
                if ((bot.gp - gp) >= 0) {
                    res()
                    base('bank').update([
                        {
                            "id": bot.id,
                            "fields": {
                                "Balance": bot.gp - gp
                            }
                        },
                        {
                            "id": user.id,
                            "fields": {
                                "Balance": user.gp + gp
                            }
                        }
                    ])
                    slack(id,`<@${bot_id}> gave you ${gp}gp for the reason - "${reason}", and now you have ${user.gp+gp}gp`);
                } else {
                    rej()
                }
            })
    })
}
var fine = (gp, id, reason, bot_id) => {
    return new Promise((res, rej) => {
        var bot,user;
        base("bank").select({ view: "Grid view" ,filterByFormula:"{User} = '"+id+"'"})
            .eachPage((records, fetch) => {
                records.forEach((record) => {
                    user = { id: record.id, gp: record.get("Balance") };
                },(err) => console.log(err))
                fetch();
            }, () => {
                if ((user.gp - gp) >= 0) {
                    res()
                    base('bank').update([
                        {
                            "id": user.id,
                            "fields": {
                                "Balance": user.gp - gp
                            }
                        }
                    ])
                    slack(id,`<@${bot_id}> fined you ${gp}gp for the reason - "${reason}", and now you have ${user.gp -gp}gp`);
                } else {
                    rej()
                }
            })
    })
}
var auth = (uuid, token, type) => {
    return new Promise((res, rej) => {
        base('api').select({
            view: "Grid view"
        }).eachPage((records, fetchNextPage) => {
            records.forEach((record) => {
                if (record.get("ID") == uuid && record.get("Token") == token && record.get("Permissions").includes(type)) {
                    res();
                    return;
                }
            });
            fetchNextPage();
        }, () => rej());
    })
}
const PORT = 3000;

app.get("/", (req, res) => {
    res.send("Hi im here. JSON me api.");
})

app.post("/give", (req, res) => {
    var { bot_id, send_id, gp, token, reason } = req.body;
    reason = reason ? reason : "No reason given";
    auth(bot_id, token,"Give")
        .then(() => {
            send(gp, send_id, reason, bot_id)
                .then(() => res.sendStatus(200))
                .catch(() => res.send("Insufficient Balance"))
        })
        .catch((err) => {
            console.log(err)
            res.sendStatus(401);
        })
})
app.post("/fine", (req, res) => {
    var { bot_id, send_id, gp, token, reason } = req.body;
    reason = reason ? reason : "No reason given";
    auth(bot_id, token,"Fine")
        .then(() => {
            fine(gp, send_id, reason, bot_id)
                .then(() => res.sendStatus(200))
                .catch(() => res.send("Error, Contact @neelr"))
        })
        .catch((err) => {
            console.log(err)
            res.sendStatus(401);
        })
})

app.listen(PORT, () => console.log("Listening on port " + PORT))