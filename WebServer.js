var wsServer = require('ws');
var wss = new wsServer.Server({port: 6010});

var UserList = [];
var BombList = [];
var container = {};
TimerBombCnt = 0;
ClassicBombCnt = 0;

const latitudeRate = 1112000;       //  latitude 1 차이 : 111.20km 차이 (1112000m)
const longitudeRate = 882700;       //  longitude 1 차이 : 88.27km 차이 (882700m)

//  폭탄 탐색 연산 수행 시 
function findBomb(userLatitude, userLongitude, bombLatitude, bombLongitude) {
    if(Math.sqrt(Math.pow((userLatitude - bombLatitude)*latitudeRate, 2)
                + Math.pow((userLongitude - bombLongitude)*longitudeRate, 2)) <= 200)
        return true;
    else
        return false;
}


//  클라이언트 연결
wss.on('connection', (client) => {
    console.log('client connected');
    UserList.push(client);
    client.send(client + ' connected');
    client.send('Hello from server');
    //  메시지 수신시
    client.on('message', (message) => {
        rcvMsg = JSON.parse(message);
        
        if(rcvMsg.com == 'Inject') {            //  폭탄 설치일 경우
            console.log("Inject coord latitude : ", rcvMsg.latitude);
            console.log("Inject coord longitude : ", rcvMsg.longitude);
            console.log("Bomb Type : ", rcvMsg.bombCode);
            console.log("Explose Time : ", rcvMsg.ExploseTime);
            container = {
                com : 'inject',
                userID : rcvMsg.bombCode + toString(TimerBombCnt++),
                bombCode : rcvMsg.bombCode,
                latitude : rcvMsg.latitude,
                longitude : rcvMsg.longitude,
                InjectTime : rcvMsg.InjectTime,
                ExploseTime : rcvMsg.ExploseTime
            }
            client.send(JSON.stringify(container));
            container.com = null;
            BombList.push(container);
            console.log("Left Bombs : " + BombList.length);
        } 
        else if(rcvMsg.com == 'Search') {       //  주변 탐지일 경우
            userLatitude = rcvMsg.latitude;
            userLongitude = rcvMsg.longitude;
            console.log("UserID : ", rcvMsg.userID);
            console.log("User's Latitude : ", userLatitude);
            console.log("User's Longitude : ", userLatitude);
            BombList.forEach((item, index, array) => {
                if(item.userID != rcvMsg.userID && findBomb(userLatitude, userLongitude, item.latitude, item.longitude)) {
                    console.log('Bomb detected : ' + item.latitude + ', ' + item.longitude);
                    container = item;
                    container.com = 'search';
                    client.send(JSON.stringify(container));
                }
            });
        }
        else if(rcvMsg.com == 'Explose') {      //  폭탄 폭발일 경우
            bombLatitude = rcvMsg.latitude;
            bombLongitude = rcvMsg.longitude;
            
            //  폭발 좌표를 유저들에게 전송
            UserList.forEach((item, index, array) => {
                if(item != client) {
                    result = {
                        com : 'explose',
                        latitude : rcvMsg.latitude,
                        longitude : rcvMsg.longitude
                    };
                    item.send(JSON.stringify(result));
                }
            });

            //  폭발한 해당 폭탄 리스트에서 제거
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
        console.log(client + ' disconnected');
    });
});

console.log('Server is opened on port 6010');