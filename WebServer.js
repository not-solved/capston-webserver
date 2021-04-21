var wsServer = require('ws');
var wss = new wsServer.Server({port: 6010});

var UserList = [];
var BombList = [];
var container = {};
TimerBombCnt = 0;
ClassicBombCnt = 0;

function calculateDistance(mainLatitude, mainLongitude, targetLatitude, targetLongitude) {
    if(Math.sqrt(Math.pow(mainLatitude - targetLatitude, 2) + Math.pow(mainLongitude - targetLongitude, 2)) < 20)
        return true;
    else
        return false;
}

function findBomb(userLatitude, userLongitude, bombLatitude, bombLongitude) {
    if(Math.sqrt(Math.pow(userLatitude - bombLatitude, 2) + Math.pow(userLongitude - bombLongitude, 2)) < 200)
        return true;
    else
        return false;
}


wss.on('connection', (client) => {
    //  클라이언트 연결
    UserList.push(client);
    console.log('Cleint connected');
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
            userLatitude = rcvMsg.longitude;
            console.log("User's Latitude : ", userLatitude);
            console.log("User's Longitude : ", userLatitude);
            BombList.forEach((item, index, array) => {
                if(findBomb(userLatitude, userLongitude, item.latitude, item.longitude)) {
                    client.Send(JSON.stringify(item));
                }
            });
        }
        else if(rcvMsg.com == 'Explose') {      //  폭탄 폭발일 경우
            bombLatitude = rcvMsg.latitude;
            bombLongitude = rcvMsg.longitude;
            UserList.forEach((item, index, array) => {
                if(calculateDistance(bombLatitude, bombLongitude, item.latitude, item.longitude)) {
                    result = {
                        com : 'dead'
                    };
                    item.Send(JSON.stringify(result));
                }
                if(item == client) {

                }
            });
        }
        else if(rcvMsg.com == 'Remove') {       //  폭텐을 제거하는 경우
            
        }
    });
});

console.log('Server is opened on port 6010');