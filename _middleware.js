const proxyIPs = [
  '172.67.156.72',
  '104.17.11.193',
  '104.25.211.158',
  '104.26.1.18'
];

const userID = '9001a117-0aa7-4028-971c-e3620df969ee'; 

export default {
  async fetch(request, env, ctx) {
    try {
      const upgradeHeader = request.headers.get('Upgrade');
      
      // هدایت ترافیک معمولی به سایت اصلی
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return env.ASSETS.fetch(request);
      }

      // اجرای تانل VLESS برای وب‌ساکت
      const webSocketPair = new WebSocketPair();
      const [clientWebSocket, serverWebSocket] = Object.values(webSocketPair);
      clientWebSocket.accept();

      let remoteSocket = null;
      let isFirstChunk = true;

      clientWebSocket.addEventListener('message', async (event) => {
        try {
          const chunk = event.data;
          if (isFirstChunk) {
            isFirstChunk = false;
            const view = new DataView(chunk);
            if (view.getUint8(0) !== 0) return clientWebSocket.close();

            const idBytes = new Uint8Array(chunk.slice(1, 17));
            const idHex = Array.from(idBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            const formattedUUID = `${idHex.slice(0,8)}-${idHex.slice(8,12)}-${idHex.slice(12,16)}-${idHex.slice(16,20)}-${idHex.slice(20)}`;

            if (formattedUUID !== userID.toLowerCase()) return clientWebSocket.close();

            let offset = 17;
            const port = view.getUint16(offset);
            offset += 2;
            const addressType = view.getUint8(offset);
            offset += 1;

            let address = '';
            if (addressType === 1) {
              address = Array.from(new Uint8Array(chunk.slice(offset, offset + 4))).join('.');
            } else if (addressType === 2) {
              const domainLength = view.getUint8(offset);
              address = new TextDecoder().decode(chunk.slice(offset + 1, offset + 1 + domainLength));
            }

            const randomProxy = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
            remoteSocket = connect({ hostname: randomProxy, port: port });
            
            const responseHeader = new Uint8Array([0, 0]);
            clientWebSocket.send(responseHeader);

            remoteSocket.readable.pipeTo(new WritableStream({
              write(chunk) { clientWebSocket.send(chunk); },
              close() { clientWebSocket.close(); }
            }));
          } else {
            if (remoteSocket && remoteSocket.writable) {
              const writer = remoteSocket.writable.getWriter();
              await writer.write(chunk);
              writer.releaseLock();
            }
          }
        } catch (err) {
          clientWebSocket.close();
        }
      });

      clientWebSocket.addEventListener('close', () => {
        if (remoteSocket && remoteSocket.writable) remoteSocket.writable.close();
      });

      return new Response(null, { status: 101, webSocket: serverWebSocket });

    } catch (err) {
      return new Response(err.toString(), { status: 500 });
    }
  }
};
