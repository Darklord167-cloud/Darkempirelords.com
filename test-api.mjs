import http from 'http';
http.get('http://localhost:3000/api/birdeye?address=8yGrrj6d9p4WNPRkunVo1NwkRSX3VTo43ZS39xu7jupx', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data.substring(0, 200)));
}).on('error', console.error);
