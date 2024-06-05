import {WebSocketServer}from "ws"
import inquirer from "inquirer"
import fs from "fs-extra"
import express from "express"
import {fileURLToPath } from 'url';
import path,{ dirname } from 'path';
import {networkInterfaces} from "os"
const PORT=8080
const listInterfaces =Object.keys(networkInterfaces())
const interfaces=networkInterfaces()

var uri=`/static/ext/`
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app=express()

app.use('/static', express.static('public'))

app.get("/",(req,res)=>{
    res.sendFile(path.join(__dirname + '/client.html'))
})

app.get("/video/:urlvideo", function (req, res) {
    const range = req.headers.range;
    const videoPath = "./public/ext/" + req.params.urlvideo;
    if (!range) {
        res.status(400).send("Requires Range header");
    }
    
    if(req.headers.connection != undefined){
        res.redirect("/static/ext/" + req.params.urlvideo)
    }else{
        const videoSize = fs.statSync("./public/ext/" + req.params.urlvideo).size;
        const CHUNK_SIZE = 10 ** 6;
        const start = Number(range.replace(/\D/g, ""));
        const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
        const contentLength = end - start + 1;
        const headers = {
            "Content-Range": `bytes ${start}-${end}/${videoSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": contentLength,
            "Content-Type": "video/mp4",
        };
        res.writeHead(206, headers);
        const videoStream = fs.createReadStream(videoPath, { start, end });
        videoStream.pipe(res);

    }

});


const wss= new WebSocketServer({port:8282})
wss.setMaxListeners(0)
var sockets=new Map()
wss.on("connection",(socket)=>{
socket.setMaxListeners(0)
    socket.onmessage=(dat)=>{
        socket.id=dat.data
        sockets.set(dat.data,socket)
        menu()
    }
    socket.close=()=>{
        sockets.delete(socket.id)
    }
})

const question=inquirer.createPromptModule()


async function menu(){
    process.stdout.write('\x1Bc')
    console.log(`SERVER: \x1b[36;4mhttp://${interfaces}:${PORT}`)
    const client=await question({
        name:"cliente",
        type:"text",
    })
    process.stdout.write('\x1Bc')
    let videos=await fs.readdirSync("./public/ext")
    videos.unshift("YOUTUBE")
    const selected=await question({
        name:"select",
        type:"list",
        choices:videos
    })
    const mimetype=selected.select.split('.')

    switch (mimetype[mimetype.length-1]) {
        case "mp4":
            if(sockets.get(client.cliente)){
                sockets.get(client.cliente).send("/video/" + selected.select)
                menu()
            }else{
                console.log("nao")
                menu()
            }
            break;
        case "jpg":
            if(sockets.get(client.cliente)){
                sockets.get(client.cliente).send(uri + selected.select)
                menu()
            }else{
                console.log("nao")
                menu()
            }
            break;
        case "webp":
            if(sockets.get(client.cliente)){
                sockets.get(client.cliente).send(uri + selected.select)
                menu()
            }else{
                console.log("nao")
                menu()
            }
            break;
        case "YOUTUBE":
            process.stdout.write('\x1Bc')
            const urlVideo=await question({
                name:"url",
                type:"text",
            })

            if(sockets.get(client.cliente)){
                var videoID=urlVideo.url.split('=')
                videoID=videoID[videoID.length-1]
                sockets.get(client.cliente).send(videoID + '.YOUTUBE')
                menu()
            }else{
                console.log("nao")
                menu()
            }
            break;
        default:
            let videos=await fs.readdirSync("./public/ext/"+ selected.select)
            videos[videos.length]=`${selected.select}`
            
            sockets.get(client.cliente).send(JSON.stringify(videos))
            menu()
            break;
    }

}

app.listen(PORT,()=>{
    listInterfaces.forEach((el)=>{
        //console.log(interfaces[el])
        console.log(`SERVER: \x1b[36;4mhttp://${interfaces[el][0].address}:${PORT} \x1b[37m`)
    })
})
