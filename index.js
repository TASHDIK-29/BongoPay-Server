const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = 8080;

// Middleware
app.use(express.json());
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

//8DSd6mEzwMScwQBd
//BongoPay


const uri = "mongodb+srv://BongoPay:8DSd6mEzwMScwQBd@cluster0.iepmiic.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        // deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const usersCollection = client.db("BongoPay").collection("user");
        const usersInboxCollection = client.db("BongoPay").collection("inbox");


        // save user data at DB
        app.post('/users', async (req, res) => {
            const user = req.body;
            // console.log(user);

            // insert email if User does not exist
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exist!', insertedId: null })
            }

            const salt = await bcrypt.genSalt(10)
            const securePin = await bcrypt.hash(req.body.password, salt)

            const totalUser = (await usersCollection.find().toArray()).length
            console.log("tot user -> ", totalUser);

            const userInfo = {
                fullName: req.body.fullName,
                email: req.body.email,
                number: req.body.number,
                type: "User",
                password: securePin,
                balance: 5000,
                currentSavings: 0,
                goalAmount: 0,
                ID: totalUser + 1
            }
            const result = await usersCollection.insertOne(userInfo);

            const inboxInfo = {
                email: req.body.email,
                type: "Account Creation",
                amount: 5000,
                fromName: "Admin",
                fromEmail: "bongo@pay.com",
                time: new Date()
            }
            const result2 = await usersInboxCollection.insertOne(inboxInfo);

            res.send(result);
        })



        // Login
        app.post('/login', async (req, res) => {
            const { email, password } = req.body;

            // console.log('email and pin', email, password);

            // const query = {
            //     $or: [
            //         { email: emailOrNumber },
            //         { phone: emailOrNumber }
            //     ]
            // };

            // by only email
            const query = { email: email };

            const user = await usersCollection.findOne(query);
            // console.log('user', user);

            if (user) {
                const isPinValid = await bcrypt.compare(password, user.password);
                if (isPinValid) {
                    // console.log('User exists:', user);

                    // const token = jwt.sign({ email: user.email }, SECRET_KEY, { expiresIn: '1h' });
                    // res.json({ token, type: user.type });


                    return res.send({ isUser: true, password: true, type: user.type, user });
                } else {
                    console.log('Invalid password');
                    return res.send({ isUser: true, password: false });
                }
            } else {
                console.log('User does not exist');
                return res.send({ user: false });
            }

        })



        // Send Money
        app.patch('/sendMoney', async (req, res) => {

            const sendMoneyInfo = req.body;
            // console.log(sendMoneyInfo);

            const query = {
                email: sendMoneyInfo.userEmail
            };

            const user = await usersCollection.findOne(query);
            if (user.balance < parseFloat(sendMoneyInfo.amount)) {
                return res.send({ "message": "Not Enough Purse." });
            }
            // const reduce = sendMoneyInfo.amount > 100 ? sendMoneyInfo.amount + 5 : sendMoneyInfo.amount

            // const isPinValid = await bcrypt.compare(sendMoneyInfo.pin, user.pin);
            // if (isPinValid) {
            const query2 = {
                email: sendMoneyInfo.receiverEmail
            }
            const isActivatedUser = await usersCollection.findOne(query2);

            if (isActivatedUser) {

                const filter1 = { email: sendMoneyInfo.receiverEmail };
                const filter2 = { email: sendMoneyInfo.userEmail };

                const updateDoc1 = {
                    $set: {
                        balance: isActivatedUser.balance + parseFloat(sendMoneyInfo.amount)
                    }
                };

                const updateDoc2 = {
                    $set: {
                        balance: user.balance - parseFloat(sendMoneyInfo.amount)
                    }
                };

                const result1 = await usersCollection.updateOne(filter1, updateDoc1);
                const result2 = await usersCollection.updateOne(filter2, updateDoc2);


                const inboxInfo = {
                    email: sendMoneyInfo.userEmail,
                    type: "Send Money",
                    amount: sendMoneyInfo.amount,
                    fromName: isActivatedUser.fullName,
                    fromEmail: sendMoneyInfo.receiverEmail,
                    time: new Date()
                }
                const result3 = await usersInboxCollection.insertOne(inboxInfo);

                return res.send({ receiver: true, result1: result1, result2: result2, result3: result3 })

            }
            else {
                res.send({ receiver: false })
            }

            // }
            // else {
            //     return res.send({ pin: false })
            // }

        })


        // Savings
        // app.patch('/savings', async (req, res) => {

        //     const savingsInfo = req.body;
        //     console.log(savingsInfo);

        //     const query = {
        //         email: savingsInfo.userEmail
        //     };

        //     const user = await usersCollection.findOne(query);
        //     if (user.balance < parseFloat(savingsInfo.amount)) {
        //         return res.send({ "message": "Not Enough Purse." });
        //     }



        //     const filter1 = { email: savingsInfo.userEmail };

        //     const updateDoc1 = {
        //         $set: {
        //             balance: user.balance - parseFloat(savingsInfo.amount),
        //             currentSavings: user.currentSavings + parseFloat(savingsInfo.amount)
        //         }
        //     };

        //     const result1 = await usersCollection.updateOne(filter1, updateDoc1);


        //     const inboxInfo = {
        //         email: savingsInfo.userEmail,
        //         type: "Deposit",
        //         amount: savingsInfo.amount,
        //         fromName: user.fullName,
        //         fromEmail: savingsInfo.userEmail,
        //         time: new Date()
        //     }
        //     const result2 = await usersInboxCollection.insertOne(inboxInfo);

        //     return res.send({ receiver: true, result1: result1, result2: result2 });
        // })

        app.patch('/savings', async (req, res) => {
            const savingsInfo = req.body;

            const query = { email: savingsInfo.userEmail };
            const user = await usersCollection.findOne(query);

            if (!user) {
                return res.status(404).send({ message: "User not found." });
            }

            if (user.balance < parseFloat(savingsInfo.amount)) {
                return res.send({ message: "Not Enough Purse." });
            }

            const updateDoc1 = {
                $set: {
                    balance: user.balance - parseFloat(savingsInfo.amount),
                    currentSavings: user.currentSavings + parseFloat(savingsInfo.amount)
                }
            };
            const res1 = await usersCollection.updateOne(query, updateDoc1);

            const inboxInfo = {
                email: savingsInfo.userEmail,
                type: "Deposit",
                amount: parseFloat(savingsInfo.amount),
                fromName: user.fullName,
                fromEmail: savingsInfo.userEmail,
                time: new Date()
            };
            const res2 = await usersInboxCollection.insertOne(inboxInfo);


            return res.send({ res1, res2 });
        });
        // Savings Goal
        app.patch('/setGoalAmount', async (req, res) => {
            const goalInfo = req.body;

            const query = { email: goalInfo.userEmail };
            const user = await usersCollection.findOne(query);

            const updateDoc1 = {
                $set: {
                    goalAmount: parseInt(goalInfo.amount)
                }
            };
            const res1 = await usersCollection.updateOne(query, updateDoc1);

            return res.send({ res1 });
        });
        // withdrawal
        app.patch('/withdrawal', async (req, res) => {
            const withdrawalInfo = req.body;

            const query = { email: withdrawalInfo.userEmail };
            const user = await usersCollection.findOne(query);

            const updateDoc1 = {
                $set: {
                    balance: user.balance + parseFloat(withdrawalInfo.amount),
                    currentSavings: user.currentSavings - parseFloat(withdrawalInfo.amount)
                }
            };
            const res1 = await usersCollection.updateOne(query, updateDoc1);


            const inboxInfo = {
                email: withdrawalInfo.userEmail,
                type: "Withdrawal",
                amount: parseFloat(withdrawalInfo.amount),
                fromName: user.fullName,
                fromEmail: withdrawalInfo.userEmail,
                time: new Date()
            };
            const res2 = await usersInboxCollection.insertOne(inboxInfo);

            return res.send({ res1, res2 });
        });




        // Cash Out
        app.patch('/CashOut', async (req, res) => {

            const cashOutInfo = req.body;
            // console.log(cashOutInfo);

            const query = {
                email: cashOutInfo.userEmail
            };

            const user = await usersCollection.findOne(query);
            if (user.balance < parseFloat(cashOutInfo.amount)) {
                return res.send({ "message": "Not Enough Purse." });
            }
            // const reduce = cashOutInfo.amount > 100 ? cashOutInfo.amount + 5 : cashOutInfo.amount

            // const isPinValid = await bcrypt.compare(cashOutInfo.pin, user.pin);
            // if (isPinValid) {
            const query2 = {
                email: cashOutInfo.agentEmail,
                type: "Agent"
            }
            const isActivatedAgent = await usersCollection.findOne(query2);

            if (isActivatedAgent) {

                const filter1 = { email: cashOutInfo.agentEmail };
                const filter2 = { email: cashOutInfo.userEmail };

                const updateDoc1 = {
                    $set: {
                        balance: isActivatedAgent.balance + parseFloat(cashOutInfo.amount)
                    }
                };

                const updateDoc2 = {
                    $set: {
                        balance: user.balance - parseFloat(cashOutInfo.amount)
                    }
                };

                const result1 = await usersCollection.updateOne(filter1, updateDoc1);
                const result2 = await usersCollection.updateOne(filter2, updateDoc2);

                const inboxInfo = {
                    email: cashOutInfo.userEmail,
                    type: "Cash Out",
                    amount: cashOutInfo.amount,
                    fromName: isActivatedAgent.fullName,
                    fromEmail: cashOutInfo.agentEmail,
                    time: new Date()
                }
                const result3 = await usersInboxCollection.insertOne(inboxInfo);

                return res.send({ agent: true, result1: result1, result2: result2, result3: result3 })

            }
            else {
                res.send({ agent: false })
            }

            // }
            // else {
            //     return res.send({ pin: false })
            // }

        })


        // Money Request
        app.post('/MoneyRequest', async (req, res) => {
            const { userEmail, requestEmail, amount } = req.body;

            const query1 = { email: requestEmail };
            const query2 = { email: userEmail };

            const requestUser = await usersCollection.findOne(query1);
            const user = await usersCollection.findOne(query2);

            if (requestUser) {
                const inboxInfo = {
                    email: requestEmail,
                    type: "Money Request",
                    amount: amount,
                    fromName: user.fullName,
                    fromEmail: userEmail,
                    time: new Date()
                }
                const result = await usersInboxCollection.insertOne(inboxInfo);

                res.send({ result: result, request: true });

            } else {
                console.log('User does not exist');
                return res.send({ request: false });
            }

        })




        // Inbox
        app.get('/inbox', async (req, res) => {
            const userEmail = req.query.userEmail;
            // console.log("userEmail->", userEmail);

            const query = {
                email: userEmail
            };

            const data = await usersInboxCollection.find(query).sort({ time: -1 }).toArray();

            res.send(data);
        })

        // Current Savings Info
        app.get('/currentSavings', async (req, res) => {
            const userEmail = req.query.userEmail;
            console.log("userEmail->", userEmail);

            const query = {
                email: userEmail
            };

            // Filter transactions by type 'Deposit' or 'Withdrawal'
            const filteredTransactions = await usersInboxCollection.find({
                email: userEmail,
                type: { $in: ["Deposit", "Withdrawal"] }
            }).sort({ time: -1 }).toArray();

            const transactions = filteredTransactions.map((tx, index) => ({
                id: index + 1,
                amount: tx.amount,
                date: tx.time.toISOString().split('T')[0],
                type: tx.type
            }));

            const user = await usersCollection.findOne(query);

            const response = {
                currentSavings: user.currentSavings,
                goalAmount: user.goalAmount,
                transactions
            };

            return res.send(response);
        })


        // Check Balance
        app.get('/checkBalance', async (req, res) => {
            const userEmail = req.query.userEmail;
            // console.log("userEmail->", userEmail);

            const query = {
                email: userEmail
            };

            const user = await usersCollection.findOne(query);

            res.send({ balance: user.balance });
        })

        // Switch To Agent
        app.patch('/switchToAgent', async (req, res) => {
            const { userEmail } = req.body;
            console.log("userEmail->", userEmail);

            const filter = { email: userEmail };

            const updateDoc = {
                $set: {
                    type: "Agent"
                }
            };

            const result = await usersCollection.updateOne(filter, updateDoc);

            const user = await usersCollection.findOne({ email: userEmail });

            res.send({ user });
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('bongo pay server is on');
})


// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`App listening on http://192.168.0.108:${port}`); // Change to your local IP
});