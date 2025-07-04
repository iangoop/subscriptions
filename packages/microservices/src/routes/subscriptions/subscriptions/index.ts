import {
  FastifyPluginAsyncTypebox,
  TypeBoxTypeProvider,
} from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { ISubscription, SubscriptionSchema } from '@src/models/Subscription';
import { SubscriptionService } from '@src/services/SubscriptionService';

const createSubscriptionForProductSchema = Type.Pick(SubscriptionSchema, [
  'customerId',
  'shippingAddressId',
  'billingAddressId',
  'productId',
  'quantity',
  'schedule',
  'couponCode',
  'useFixedPrice',
  'fixedPrice',
  'currency',
  'paymentMethodCode',
  'paymentCode',
  'shippingMethodCode',
]);

const skipSubscriptionSchema = Type.Pick(SubscriptionSchema, ['id']);

const products: FastifyPluginAsyncTypebox = async (
  fastify,
  opts,
): Promise<void> => {
  const fastifyWithTypeProvider =
    fastify.withTypeProvider<TypeBoxTypeProvider>();
  const subscriptionService = new SubscriptionService();

  fastifyWithTypeProvider.post<{ Body: ISubscription }>(
    '/createSubscriptionForProduct',
    {
      schema: createSubscriptionForProductSchema,
    },
    async function (request, reply) {
      const subscription = request.body;
      await subscriptionService.createSubscriptionForProduct(subscription);
    },
  );

  fastifyWithTypeProvider.post<{ Body: ISubscription }>(
    '/skipSubscription',
    {
      schema: skipSubscriptionSchema,
    },
    async function (request, reply) {
      const subscription = request.body;
      await subscriptionService.skipSubscription(subscription.id);
    },
  );

  return Promise.resolve();
};

export default products;
