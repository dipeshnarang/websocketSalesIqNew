const {updatedData}=require('./models/sendData')
const http=require('http')
const express=require('express')
const socketio=require('socket.io')
const schedule=require('node-schedule')
const path=require('path')

const app=express()
const server=http.createServer(app)
const io=socketio(server)

const port=process.env.PORT || 4001
const publicDirPath=path.join( __dirname , './../public')

app.use(express.static(publicDirPath))
app.use(express.json())

io.on('connection',(socket)=>{

     socket.emit('message',updatedData())

    schedule.scheduleJob('*/5 * * * * *',function(){
        socket.emit('message',updatedData())
    })
})

server.listen(port,()=>{
    console.log('Running on port: '+port)
})
