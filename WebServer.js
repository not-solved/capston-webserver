var wsServer = require('ws');
var wss = new wsServer.Server({port: 6010});

var UserList = [];
var BombList = [];
var container = {};
UserCount = 0;
SmallBombCnt = 0;
MediumBombCnt = 0;
LargeBombCnt = 0;

const latitudeRate = 111200;       //  latitude 1 차이 : 111.20km 차이 (1112000m)
const longitudeRate = 88270;       //  longitude 1 차이 : 88.27km 차이 (882700m)
var isDetected = false;
var isSended = false;

function calculateDistance(userLatitude, userLongitude, bombLatitude, bombLongitude) {
    return Math.sqrt((Math.pow(userLatitude - bombLatitude)*latitudeRate, 2) + Math.pow((userLongitude - bombLongitude)*longitudeRate, 2));
}

//  클라이언트 연결
wss.on('connection', (client) => {
    console.log("Connection detected");

    //  메시지 수신시
    client.on('message', (message) => {
        rcvMsg = JSON.parse(message);
        if(rcvMsg.com == "InitialConnection") {
            container = {
                com : "Connect",
                bombCode : "",
                bombID : "",
                installUser : rcvMsg.installUser,
                latitude : 0,
                longitude : 0,
                InjectTime : "",
                ExploseTime : ""
            }
            UserCount++;
            client.send(JSON.stringify(container));
            UserList.push([ client, container.installUser ]);    
            console.log('Hello ' + container.installUser);    
            return;
        }
        
        console.log("================================================");
        console.log('message from client : ', rcvMsg.com);
        if(rcvMsg.com == 'Inject') {            //  폭탄 설치일 경우
            console.log("================================================");
            console.log("Inject user : ", rcvMsg.installUser);
            console.log("Inject coord latitude : ", rcvMsg.latitude);
            console.log("Inject coord longitude : ", rcvMsg.longitude);
            console.log("Bomb Type : ", rcvMsg.bombCode);
            console.log("Explose Time : ", rcvMsg.ExploseTime);

            isSended = false;
            BombList.forEach((item, index, array) => {
                if(calculateDistance(rcvMsg.latitude, rcvMsg.longitude, item.latitude, item.longitude) <= 10) {
                    container.com = 'inject';
                    container.bombCode = 'Failed';
                    container.installUser = calculateDistance(rcvMsg.latitude, rcvMsg.longitude, item.latitude, item.longitude).toString();
                    client.send(JSON.stringify(container));
                    isSended = true;
                }
            })
            if(!isSended) {
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
                BombList.push(container);
                console.log("Left Bombs : " + BombList.length);    
            }
        } 
        else if(rcvMsg.com == 'Search') {       //  주변 탐지일 경우
            userLatitude = rcvMsg.latitude;
            userLongitude = rcvMsg.longitude;
            console.log("================================================");
            console.log("UserID : ", rcvMsg.installUser);
            console.log("User's Latitude : ", userLatitude);
            console.log("User's Longitude : ", userLongitude);
            console.log("left  bombs : ", BombList.length);

            isDetected = false;
            BombList.forEach((item, index, array) => {
                if( calculateDistance(userLatitude, userLongitude, item.latitude, item.longitude) <= 50
                    && item.installUser != rcvMsg.installUser) {
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
                user[0].send(JSON.stringify(container));
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
        else if(rcvMsg.com == 'Remove') {       //  폭탄을 제거하는 경우
            removeComplete = false;
            console.log("================================================");
            console.log("User : ", rcvMsg.installUser);
            for(i = 0; i < BombList.length; i++) {
                if(BombList[i].bombID == rcvMsg.bombID) {
                    container = BombList[i];
                    container.com = "remove";
                    UserList.forEach((users, index, array) => {
                        users[0].send(JSON.stringify(container));
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
        else if(rcvMsg.com == 'Attacked') {     //  누군가 폭발에 휩쓸리는 경우
            console.log("================================================");
            console.log("Someone is attacked");
            for(i = 0; i < UserList.length; i++) {
                if(UserList[i][1] == rcvMsg.installUser) {
                    container.com = "attack";
                    UserList[i][0].send(JSON.stringify(container));
                    break;
                }
            }
        }
    });

    //  클라이언트 연결 해제 ==> 리스트에서 클라이언트 제거
    client.on('close', () => {
        targetIdx = 0;
        ClientName = '';
        for(i = 0; i < UserList.length; i++) {
            if(UserList[i][0] == client) {
                targetIdx = i;
                ClientName = UserList[i][1];
                break;
            }
        }
        UserList.splice(targetIdx, 1);

        for(i = 0; i < BombList.length; i++) {
            if(BombList[i].installUser == ClientName) {
                container = BombList[i];
                container.com = "SessionOut";
                UserList.forEach((users, index, array) => {
                    users[0].send(JSON.stringify(container));
                });
            }
        }

        /*
        //  제거한 폭탄 리스트에서 제거
        for(i = 0; i < BombList.length; i++) {
            if(BombList[i].installUser == ClientName) {
                BombList.splice(i, 1);
                i--;
                break;
            }
        }
        */
        console.log(ClientName + ' disconnected');
    });
});

console.log('Server is opened on port 6010');