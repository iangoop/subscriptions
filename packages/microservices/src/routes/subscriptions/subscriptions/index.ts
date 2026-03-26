import {
  FastifyPluginAsyncTypebox,
  TypeBoxTypeProvider,
} from '@fastify/type-provider-typebox';
import { Static, Type } from '@sinclair/typebox';
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

const skipSubscriptionSchema = Type.Pick(SubscriptionSchema, [
  'id',
  'customerId',
]);
const queryCustomerSubscriptionPlanningSchema = Type.Object({
  customerId: Type.String(),
  monthsToShow: Type.Number({ default: 6 }),
});

const products: FastifyPluginAsyncTypebox = async (
  fastify,
  opts,
): Promise<void> => {
  const fastifyWithTypeProvider =
    fastify.withTypeProvider<TypeBoxTypeProvider>();
  const subscriptionService = new SubscriptionService();

  fastifyWithTypeProvider.post<{ Body: ISubscription }>(
    '/create-subscription',
    {
      schema: { body: createSubscriptionForProductSchema },
    },
    async function (request, reply) {
      const subscription = request.body;
      await subscriptionService.createSubscriptionForProduct(subscription);
    },
  );

  fastifyWithTypeProvider.post<{ Body: ISubscription }>(
    '/skip-subscription',
    {
      schema: { body: skipSubscriptionSchema },
    },
    async function (request, reply) {
      const subscription = request.body;
      await subscriptionService.skipSubscription(
        subscription.id,
        subscription.customerId,
      );
    },
  );

  fastifyWithTypeProvider.post<{
    Body: Static<typeof queryCustomerSubscriptionPlanningSchema>;
  }>(
    '/customer-subscription-planning',
    {
      schema: { body: queryCustomerSubscriptionPlanningSchema },
    },
    async function (request, reply) {
      return await subscriptionService.getCustomerSubscriptionPlanning(
        request.body.customerId,
        request.body.monthsToShow,
      );
    },
  );

  return Promise.resolve();
};

export default products;
