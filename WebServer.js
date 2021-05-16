var wsServer = require('ws');
var wss = new wsServer.Server({port: 6010});

var UserList = [];
var BombList = [];
var container = {};
UserCount = 0;
SmallBombCnt = 0;
MediumBombCnt = 0;
LargeBombCnt = 0;

const latitudeRate = 1112000;       //  latitude 1 차이 : 111.20km 차이 (1112000m)
const longitudeRate = 882700;       //  longitude 1 차이 : 88.27km 차이 (882700m)

function calculateDistance(userLatitude, userLongitude, bombLatitude, bombLongitude) {
    return Math.sqrt((Math.pow(userLatitude - bombLatitude)*latitudeRate, 2) + Math.pow((userLongitude - bombLongitude)*longitudeRate, 2));
}

//  클라이언트 연결
wss.on('connection', (client) => {
    UserList.push(client);
    container = {
        com : "Connect",
        bombCode : "",
        bombID : "",
        installUser : "Client",
        latitude : 0,
        longitude : 0,
        InjectTime : "",
        ExploseTime : ""
    }
    container.installUser += UserCount++;
    client.send(JSON.stringify(container));
    
    clientName = container.installUser;
    console.log(clientName, ' connected');
    //  메시지 수신시
    client.on('message', (message) => {
        
        rcvMsg = JSON.parse(message);
        console.log('message from client : ', rcvMsg.com);
        if(rcvMsg.com == 'Inject') {            //  폭탄 설치일 경우
            console.log("================================================");
            console.log("Inject user : ", rcvMsg.installUser);
            console.log("Inject coord latitude : ", rcvMsg.latitude);
            console.log("Inject coord longitude : ", rcvMsg.longitude);
            console.log("Bomb Type : ", rcvMsg.bombCode);
            console.log("Explose Time : ", rcvMsg.ExploseTime);
            container = {
                com : 'inject',
                bombCode : rcvMsg.bombCode,
                bombID : rcvMsg.bombCode,
                installUser : rcvMsg.installUser,
                latitude : rcvMsg.latitude,
                longitude : rcvMsg.longitude,
                InjectTime : rcvMsg.InjectTime,
                ExploseTime : rcvMsg.ExploseTime
            }
            if(rcvMsg.bombCode == 'Small')
                container.bombID += SmallBombCnt++;
            else if(rcvMsg.bombCode == 'Medium')
                container.bombID += MediumBombCnt++;
            else
                container.bombID += LargeBombCnt++;
            
            console.log(container.bombID);
            client.send(JSON.stringify(container));
            container.com = null;
            BombList.push(container);
            console.log("Left Bombs : " + BombList.length);
        } 
        else if(rcvMsg.com == 'Search') {       //  주변 탐지일 경우
            userLatitude = rcvMsg.latitude;
            userLongitude = rcvMsg.longitude;
            console.log("================================================");
            console.log("UserID : ", rcvMsg.installUser);
            console.log("User's Latitude : ", userLatitude);
            console.log("User's Longitude : ", userLatitude);
            console.log("left  bombs : ", BombList.length);
            isDetected = false;
            BombList.forEach((item, index, array) => {
                if(item.installUser != rcvMsg.installUser) {
                    isDetected = true;
                    dist = calculateDistance(userLatitude, userLongitude, item.latitude, item.longitude);
                    console.log('Bomb detected : ' + dist);
                    container = item;
                    container.com = 'search';
                    client.send(JSON.stringify(container));
                }
            });
            if(!isDetected) {
                container.com = 'search';
                container.bombCode = 'NoBomb';
                client.send(JSON.stringify(container));
            }
        }
        else if(rcvMsg.com == 'Explose') {      //  폭탄 폭발일 경우
            container = {
                com : 'explose',
                bombCode : rcvMsg.bombCode,
                bombID : rcvMsg.bombID,
                installUser : rcvMsg.installUser,
                latitude : rcvMsg.latitude,
                longitude : rcvMsg.longitude,
                InjectTime : rcvMsg.InjectTime,
                ExploseTime : rcvMsg.ExploseTime
            };
            console.log("================================================");
            console.log("Explose Bomb : " + rcvMsg.bombID);
            console.log("Bomb' owner : ", rcvMsg.installUser);
            console.log("Explose latitude : " + rcvMsg.latitude);
            console.log("Explose longitude : " + rcvMsg.longitude);
            //  폭발 좌표를 유저들에게 전송
            UserList.forEach((user, index, array) => {
                user.send(JSON.stringify(container));
            });

            //  폭발한 폭탄 리스트에서 제거
            targetIdx = 0;
            for(i = 0; i < BombList.length; i++) {
                if(BombList[i] == rcvMsg.bombCode) {
                    targetIdx = i;
                    break;
                }
            }
            BombList.splice(targetIdx, 1);
        }
        else if(rcvMsg.com == 'Remove') {       //  폭텐을 제거하는 경우
            removeComplete = false;
            console.log("================================================");
            console.log("User : ", rcvMsg.installUser);
            for(i = 0; i < BombList.length; i++) {
                if(BombList[i].bombID == rcvMsg.bombID) {
                    container = BombList[i];
                    container.com = "remove";
                    UserList.forEach((users, index, array) => {
                        users.send(JSON.stringify(container));
                    });
                    console.log("Target Bomb name : ", rcvMsg.bombID);
                    removeComplete = true;
                    break;
                }
            }

            if(!removeComplete)
                console.log("No such bomb remained");
            //  제거한 폭탄 리스트에서 제거
            targetIdx = 0;
            for(i = 0; i < BombList.length; i++) {
                if(BombList[i] == rcvMsg.bombCode) {
                    targetIdx = i;
                    break;
                }
            }
            BombList.splice(targetIdx, 1);            
        }
    });

    //  클라이언트 연결 해제 ==> 리스트에서 클라이언트 제거
    client.on('close', () => {
        targetIdx = 0;
        for(i = 0; i < UserList.length; i++) {
            if(UserList[i] == client) {
                targetIdx = i;
                break;
            }
        }
        UserList.splice(targetIdx, 1);
        console.log(clientName + ' disconnected');
    });
});

console.log('Server is opened on port 6010');