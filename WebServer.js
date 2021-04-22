var wsServer = require('ws');
var wss = new wsServer.Server({port: 6010});

var UserList = [];
var BombList = [];
var container = {};
TimerBombCnt = 0;
ClassicBombCnt = 0;

const latitudeRate = 1112000;       //  latitude 1 차이 : 111.20km 차이 (1112000m)
const longitudeRate = 882700;       //  longitude 1 차이 : 88.27km 차이 (882700m)

//  폭탄 폭발 시 주변 유저들과의 거리 계산
function calculateDistance(mainLatitude, mainLongitude, targetLatitude, targetLongitude) {
    if(Math.sqrt(Math.pow((mainLatitude - targetLatitude)*latitudeRate, 2)
                + Math.pow((mainLongitude - targetLongitude)*longitudeRate, 2)) <= 20)
        return true;
    else
        return false;
}

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
            console.log("Explose Time : ", rcvMsg.ExploseTime);
            container = {
                BombID : rcvMsg.bombCode + toString(TimerBombCnt++),
                com : "inject",
                latitude : rcvMsg.latitude,
                longitude : rcvMsg.longitude,
                ExploseTime : rcvMsg.ExploseTime
            }
            BombList.push({
                BombID : rcvMsg.bombCode + toString(TimerBombCnt++),
                latitude : rcvMsg.latitude,
                longitude : rcvMsg.longitude,
                InjectTime : rcvMsg.InjectTime,
                ExploseTime : rcvMsg.ExploseTime
            });
            console.log(BombList.length);
            client.send(JSON.stringify(container));
        }   
        else if(rcvMsg.com == 'Search') {       //  주변 탐지일 경우
            userLatitude = rcvMsg.latitude;
            userLongitude = rcvMsg.longitude;
            console.log("User's Latitude : ", userLatitude);
            console.log("User's Longitude : ", userLatitude);
            BombList.forEach((item, index, array) => {
                if(findBomb(userLatitude, userLongitude, item.latitude, item.longitude)) {
                    client.send(JSON.stringify(item));
                }
            });
        }
        else if(rcvMsg.com == 'Explose') {      //  폭탄 폭발일 경우
            bombLatitude = rcvMsg.latitude;
            bombLongitude = rcvMsg.longitude;
            UserList.forEach((item, index, array) => {
                if(item != client && calculateDistance(bombLatitude, bombLongitude, item.latitude, item.longitude)) {
                    result = {
                        com : 'dead',
                    };
                    item.send(JSON.stringify(result));
                }
            });
        }
        else if(rcvMsg.com == 'Remove') {       //  폭텐을 제거하는 경우
            
        }
    });
});

console.log('Server is opened on port 6010');