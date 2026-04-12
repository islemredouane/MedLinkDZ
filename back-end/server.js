const express = require("express");

const app = express();  //express library

const dotenv = require("dotenv");
dotenv.config();    //to access data/vars from .env file


app.get("/hi", (req , res) =>{
    res.send("hello");
})



const PORT = process.env.PORT ;  //port where the server run into , gotten from ".env" file

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}}`);
});