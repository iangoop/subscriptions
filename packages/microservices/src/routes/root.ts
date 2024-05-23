import { FastifyPluginAsync } from 'fastify';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', function (request, reply) {
    return { root: true };
  });

  return Promise.resolve();
};

export default root;
