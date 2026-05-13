import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { AdminFeeConfigController } from './admin-fee-config.controller';
import { AdminProductsController } from './admin-products.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-b2c-products RBAC migration', () => {
  it('AdminFeeConfigController — read vs manage split', () => {
    expect(permissionsOf(AdminFeeConfigController, 'getGlobalConfig')).toEqual(['b2c-fees.read']);
    expect(permissionsOf(AdminFeeConfigController, 'upsertGlobalConfig')).toEqual(['b2c-fees.manage']);
    expect(permissionsOf(AdminFeeConfigController, 'listCategories')).toEqual(['b2c-fees.read']);
    expect(permissionsOf(AdminFeeConfigController, 'createCategory')).toEqual(['b2c-fees.manage']);
    expect(permissionsOf(AdminFeeConfigController, 'updateCategory')).toEqual(['b2c-fees.manage']);
    expect(permissionsOf(AdminFeeConfigController, 'deleteCategory')).toEqual(['b2c-fees.manage']);
    expect(permissionsOf(AdminFeeConfigController, 'getProductsByCategory')).toEqual(['b2c-fees.read']);
    expect(permissionsOf(AdminFeeConfigController, 'updateProductFees')).toEqual(['b2c-fees.manage']);
  });

  it('AdminProductsController — read vs manage split', () => {
    expect(permissionsOf(AdminProductsController, 'listProducts')).toEqual(['b2c-products.read']);
    expect(permissionsOf(AdminProductsController, 'createProduct')).toEqual(['b2c-products.manage']);
    expect(permissionsOf(AdminProductsController, 'calculateCost')).toEqual(['b2c-products.read']);
  });
});
