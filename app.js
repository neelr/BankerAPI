require("dotenv").config();
var express = require("express");
var app = express();
var axios = require("axios");
var qs = require("qs");
app.use(express.json());
var Airtable = require('airtable');
var base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(process.env.AIRTABLE_BASE);


var send = (gp, id, reason, give_id) => {
    return new Promise((res, rej) => {
        var giveUser;
        base("bank").select({ view: "Grid view" })
            .eachPage((records, fetch) => {
                records.forEach((record) => {
                    if (give_id == record.get("User")) {
                        giveUser = { id: record.id, gp: record.get("Balance") };
                    }
                })
                fetch();
            }, () => {
                if ((giveUser.gp - gp) >= 0) {
                    res()
                    axios.post('https://slack.com/api/chat.postMessage',
                        qs.stringify({
                            token: process.env.SLACK_TOKEN,
                            channel: "UH50T81A6",
                            text: `<@UH50T81A6> give <@${id}> ${gp}gp for ${reason}`,
                            as_user: true
                        })
                    );
                    base('bank').update([
                        {
                            "id": giveUser.id,
                            "fields": {
                                "Balance": giveUser.gp - gp
                            }
                        }
                    ])
                } else {
                    rej()
                }
            })
    })
}
var auth = (uuid, token) => {
    return new Promise((res, rej) => {
        base('api').select({
            view: "Grid view"
        }).eachPage((records, fetchNextPage) => {
            records.forEach((record) => {
                if (record.get("ID") == uuid && record.get("Token") == token) {
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
    var { give_id, send_id, gp, token, reason } = req.body;
    reason = reason ? reason : "No reason given";
    auth(give_id, token)
        .then(() => {
            send(gp, send_id, reason, give_id)
                .then(() => res.sendStatus(200))
                .catch(() => res.send("Insufficient Balance"))
        })
        .catch((err) => {
            console.log(err)
            res.sendStatus(401);
        })
})

app.listen(PORT, () => console.log("Listening on port " + PORT))