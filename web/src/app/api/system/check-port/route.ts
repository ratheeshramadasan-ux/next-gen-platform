import { NextResponse } from 'next/server';
import net from 'net';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const portStr = searchParams.get('port');
  
  if (!portStr) {
    return NextResponse.json({ error: "Port is required" }, { status: 400 });
  }

  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return NextResponse.json({ error: "Invalid port number" }, { status: 400 });
  }

  try {
    const isAvailable = await checkPortAvailable(port);
    return NextResponse.json({ port, available: isAvailable });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to check port" }, { status: 500 });
  }
}

function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        // Treat other errors as unavailable to be safe
        resolve(false); 
      }
    });

    server.once('listening', () => {
      // Port is available, close the test server
      server.close();
      resolve(true);
    });

    // Bind to all interfaces to accurately reflect if the port is free
    server.listen(port, '0.0.0.0');
  });
}
