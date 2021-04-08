const schedule=require('node-schedule')
const db=require('./../databaseConnection/mariadb')
const {getDepartments}=require('./department')
const {IST, ISTGraphResetTime }=require('./../helperFunction/helperFunction')

class GraphObject{
    constructor(deptId,obj){
        this.deptId=deptId,
        this.graphData=[obj]
    }
}

// let deptGraphData=[]

function fetchGraphData(callback){
    let time=new Date()
    time.setMinutes(time.getMinutes()-30)
    let milis=time.getTime()
    let sql='select department.ID, COUNT(chat.DEPT_ID) as DEPT_CHATS from department left join' +
    ' (select * from chat where start_time >'+milis+' ) chat on department.ID=chat.DEPT_ID  group by department.ID;'
    console.log(sql)
    db.connectionPool.getConnection().then((conn)=>{
        conn.query(sql).then((data)=>{
            conn.release()
            callback(null,data)
        }).catch((err)=>{
            conn.release()
            callback(err,null)
        })
    }).catch((err)=>{
        callback(err,null)
    })
}

function graphData(chatData){
    let departments=getDepartments()
    
    chatData.forEach((group)=>{
        let dep=departments.find((dep)=>{
            return dep.id==group.ID
        })
        let halfHourData=[[]]
        let time=new Date()
        time.setMinutes(time.getMinutes()+330)
        let hour=time.getHours()
        let minutes=time.getMinutes()
        halfHourData[0].push(hour,minutes,0)
        halfHourData.push(group.DEPT_CHATS)
        
        if(dep){
            dep.barGraph.push(halfHourData)
            if(dep.barGraph.length>24){
                dep.barGraph.shift()
            }
        }
    })   
}

// function lineGraphData(deptData){
//     deptData.forEach((department)=>{
//         console.log(department)
//         let dep=deptGraphData.find((dep)=>{
//             return dep.deptId==department.ID
//         })

//         let halfHourData=[[]]
//         let time=new Date()
//         time.setMinutes(time.getMinutes()+330)
//         let hour=time.getHours()
//         let minutes=time.getMinutes()
//         halfHourData[0].push(hour,minutes,0)
//         halfHourData.push(department.DEPT_CHATS)
        
//         if(dep){
//             dep.graphData.push(halfHourData)
//         }else{
//             deptGraphData.push(new GraphObject(department.ID,halfHourData))
//         }

//     })
//     // console.log(deptGraphData)
// }

schedule.scheduleJob('*/30 * * * *',function(){
    fetchGraphData(function(err,data){
        if(err){
            return console.log(err)
        }
        graphData(data)
        // lineGraphData(data)
    })
})


async function generateGraphDataOnStartup(){
    let departments=getDepartments()
    let startTime=IST()
    let endTime=startTime+1800000
    const till=new Date()
    
    let conn
    try{
        conn=await db.connectionPool.getConnection()
        while(endTime<till.getTime()){

            let begin=startTime
            console.log("BEGIN: "+startTime)
            let end=endTime
            console.log("END:   "+endTime)

            let sql='select department.ID, COUNT(chat.DEPT_ID) as DEPT_CHATS from department left join' +
            ' (select * from chat where start_time >'+begin+' and start_time <'+end + ' ) chat on department.ID=chat.DEPT_ID  group by department.ID;'

            const result=await conn.query(sql)
            const time=new Date(endTime)
            time.setMinutes(time.getMinutes()+330)
            let hour = time.getHours()
            console.log("HOUR:" + hour)
            let minutes = time.getMinutes()
            console.log("MINTUE:" + minutes)

            result.forEach((row) => {
                let dep = departments.find((department) => {
                    return department.id == row.ID
                })
                let halfHourData = [[]]

                halfHourData[0].push(hour, minutes, 0)
                halfHourData.push(row.DEPT_CHATS)
                if (dep) {
                    dep.barGraph.push(halfHourData)
                }
            })
            startTime+=1800000
            endTime+=1800000
        }
        
    }catch(e){
        console.log(e)
    }finally{
        if(conn){
            conn.release()
        }
    }
}

function resetGraphData(){

}

schedule.scheduleJob('30 18 * * *',function(){
    departments=getDepartments()
    departments.forEach((dep)=>{
        dep.barGraph=[]
    })
})

setTimeout(function(){
    generateGraphDataOnStartup()
},2000)
