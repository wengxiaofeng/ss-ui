import React, {useState} from 'react';
import './App.css';
import Wfs from './wfs/wfs'
const rotation = 0

function App() {

    const [wfs, setWfs] = useState('');

    const start = () => {
        if(wfs && wfs.client && wfs.client.readyState === 1) {
            wfs.destroy();
        }
        if (Wfs.isSupported()) {
            console.log('isSupported')
            var video1 = document.getElementById("video1");
            var wfs1 = new Wfs();
            //后端websocket链接：'ws://localhost:8888/display'
            wfs1.attachMedia(video1, 'ch2', 'H264Raw', 'ws://localhost:8888/display', touch);
            setWfs(wfs1);
        } else {
            console.log("浏览器不支持")
        }
    }

    const end = () => {
        wfs.destroy();
    }
    const touch = (element, ws) =>{

        let screen = {
            bounds: {}
        }

        function calculateBounds() {
            var el = element;
            screen.bounds.w = el.offsetWidth
            screen.bounds.h = el.offsetHeight
            screen.bounds.x = 0
            screen.bounds.y = 0

            while (el.offsetParent) {
                screen.bounds.x += el.offsetLeft
                screen.bounds.y += el.offsetTop
                el = el.offsetParent
            }
        }


        function coords(boundingW, boundingH, relX, relY, rotation) {
            // console.log(boundingW, boundingH, relX, relY, rotation);
            var w, h, x, y;

            switch (rotation) {
                case 0:
                    w = boundingW
                    h = boundingH
                    x = relX
                    y = relY
                    break
                case 90:
                    w = boundingH
                    h = boundingW
                    x = boundingH - relY
                    y = relX
                    break
                case 180:
                    w = boundingW
                    h = boundingH
                    x = boundingW - relX
                    y = boundingH - relY
                    break
                case 270:
                    w = boundingH
                    h = boundingW
                    x = relY
                    y = boundingW - relX
                    break
            }

            return {
                xP: x / w,
                yP: y / h,
            }
        }

        let touchDown = (index, x, y, pressure) => {
            let scaled = coords(screen.bounds.w, screen.bounds.h, x, y, rotation);
            ws.send(JSON.stringify({
                type: 'control',
                enevt: 'touchDown',
                param: {
                    contact: 0, x: scaled.xP, y: scaled.yP, pressure: 0.5
                }
            }))
        }

        let touchMove = (index, x, y, pressure) => {
            let scaled = coords(screen.bounds.w, screen.bounds.h, x, y, rotation);
            ws.send(JSON.stringify({
                type: 'control',
                enevt: 'touchMove',
                param: {
                    contact: 0, x: scaled.xP, y: scaled.yP, pressure: 0.5
                }
            }))
        }

        function touchUp(index, x, y, pressure) {
            let scaled = coords(screen.bounds.w, screen.bounds.h, x, y, rotation);
            ws.send(JSON.stringify({
                type: 'control',
                enevt: 'touchUp',
                param: {
                contact: 0, x: scaled.xP, y: scaled.yP, pressure: 0.5
            }
            }))
        }

        function runKeyevent(key) {
            ws.send(JSON.stringify({
                type: 'control',
                enevt: 'keyPress',
                param: {
                    "key": key
                }
            }))
        }

        let mouseDownListener = (event) => {
            if(ws.readyState === 3) {
            element.removeEventListener('mousedown', mouseDownListener);
            element.removeEventListener('mousewheel', mouseWheelListener);
            return;
            }

            var e = event;
            if (e.originalEvent) {
                e = e.originalEvent
            }
            e.preventDefault()

            if (e.which === 2) {
                runKeyevent("home")
                return
            }
            
            calculateBounds()

            var x = e.pageX - screen.bounds.x
            var y = e.pageY - screen.bounds.y
            var pressure = 0.5

            touchDown(0, x, y, pressure);

            element.addEventListener('mousemove', mouseMoveListener);
            document.addEventListener('mouseup', mouseUpListener);
        }

        let mouseMoveListener = (event) => {
            var e = event
            if (e.originalEvent) {
                e = e.originalEvent
            }

            if (e.which === 3) {
                return
            }
            e.preventDefault()

            var pressure = 0.5
            activeFinger(0, e.pageX, e.pageY, pressure);
            var x = e.pageX - screen.bounds.x
            var y = e.pageY - screen.bounds.y

            touchMove(0, x, y, pressure);
        }

        function mouseUpListener(event) {
            var e = event
            if (e.originalEvent) {
                e = e.originalEvent
            }
            // Skip secondary click
            if (e.which === 3) {
                return
            }
            e.preventDefault()
            var pressure = 0.5
            activeFinger(0, e.pageX, e.pageY, pressure);
            var x = e.pageX - screen.bounds.x
            var y = e.pageY - screen.bounds.y

            touchUp(0, x, y, pressure);
            stopMousing()
        }

        function stopMousing() {
            element.removeEventListener('mousemove', mouseMoveListener);
            document.removeEventListener('mouseup', mouseUpListener);
            deactiveFinger(0);
        }

        function activeFinger(index, x, y, pressure) {
            var scale = 0.5 + pressure
            // $(".finger-" + index)
            //     .addClass("active")
            //     .css("transform", 'translate3d(' + x + 'px,' + y + 'px,0)')
        }

        function deactiveFinger(index) {
            // $(".finger-" + index).removeClass("active")
        }

        let wheel = {
            count: 0,
            key: null,
            mouseY: null,
        };

        function mouseWheelListener(event) {
            if(ws.readyState === 3) {
            element.removeEventListener('mousedown', mouseDownListener);
            element.removeEventListener('mousewheel', mouseWheelListener);
            return;
            }
            let e = event
            if (e.originalEvent) {
                e = e.originalEvent
            }

            calculateBounds()
            let x = e.pageX - screen.bounds.x
            let y = e.pageY - screen.bounds.y
            let pressure = 0.5

            if (wheel.key === null) { // mouse down
                wheel.mouseY = y;
                touchDown(1, x, y, pressure)
            } else {
                clearTimeout(wheel.key)
            }

            // 从 wheel.mouseY --> targetY 分10步移动完
            wheel.count += 1
            const stepCount = 10; // 10 steps
            const direction = e.deltaY > 0 ? -1 : 1
            const offsetY = wheel.count * direction * 0.2 * screen.bounds.h
            const targetY = Math.max(0, Math.min(y + offsetY, screen.bounds.h))

            let mouseY = wheel.mouseY;
            const stepY = (targetY - mouseY) / stepCount;
            for (let i = 0; i < stepCount; i += 1) {
                mouseY += stepY;
                // touchWait(10); // 间隔10ms
                touchMove(1, x, mouseY, pressure)
            }
            wheel.mouseY = targetY; // 记录当前点的位置

            wheel.key = setTimeout(() => { // wheel stopped do mouse up
                touchUp()
                wheel.key = null;
                wheel.count = 0;
            }, 100)
        }

        /* bind listeners */
        element.addEventListener('mousedown', mouseDownListener);
        element.addEventListener('mousewheel', mouseWheelListener);
    }

    return (
        <div className="App">
            <header className="App-header">
                <button onClick={start}>开始</button>
                <button onClick={end}>结束</button>
            </header>
            <content>
                <video id="video1" muted autoPlay height="800" noloop="noloop"></video>
            </content>
        </div>
    );
}

export default App;
