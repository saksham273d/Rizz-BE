require("dotenv").config();

let express = require("express");
let cors = require("cors");
let http = require("http");
let { Server } = require("socket.io");
let { ObjectId,MongoClient } = require("mongodb");

let { messageCollec, photoCollec } = require("./config/db");
let { upload, cloudinary } = require("./config/cloudinary");

let url = process.env.MONGO_URL;
let client = new MongoClient(url);
client.connect();
let db = client.db("Rizz")
let collec = db.collection("messages")

let app = express();
let photos = db.collection("photos")
app.use(cors())
let httpServer = http.createServer(app)

let io = new Server(httpServer,{cors: {origin : "*"}})
app.get("/files",(req,res)=>{
  photos.find().toArray()
  .then((result)=>res.send(result))
  .catch((err)=>res.send(err))
})
app.post("/upload", upload.single("file"), (req,res)=>{
  let obj = {
    file_url : req.file.path,
    username : req.body.username,
    caption : req.body.caption,
    file_name : req.file.filename
  }
  photos.insertOne(obj)
  .then((result)=>res.send(result))
  .catch((err)=>res.send(err))
})
app.delete("/delete/:id",(req,res)=>{
  let _id = new ObjectId(req.params.id);
  photos.findOne({_id})
  .then((obj)=>{
    cloudinary.uploader.destroy(obj.file_name);
    photos.deleteOne({_id})
  })
  .then((result)=>res.send(result))
  .catch((err)=>res.send(err))
})

io.on("connection",(socket)=>{
  function sendHistory(){
    collec.find().toArray()
    .then((result)=>socket.emit("history", result))
    .catch((err)=>console.log(err))
  }
  console.log("User connected")

  socket.on("getHistory", sendHistory)
  socket.on("message",(data)=>{
      io.emit("message",data)
      collec.insertOne(data);
  })

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

httpServer.listen(3000, () => console.log("Server is alive at 3000"));