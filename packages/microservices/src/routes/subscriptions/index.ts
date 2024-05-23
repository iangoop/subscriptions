import { FastifyPluginAsync } from 'fastify';

const subscription: FastifyPluginAsync = async (
  fastify,
  opts,
): Promise<void> => {
  fastify.get('/', function (request, reply) {
    return { subscriptions: true };
  });

  return Promise.resolve();
};

export default subscription;
