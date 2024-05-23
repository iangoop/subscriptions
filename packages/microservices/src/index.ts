import './pre-start'; // Must be the first import
import EnvVars from '@src/configurations/EnvVars';
import server from './server';

server.listen({ port: Number(EnvVars.port) });
