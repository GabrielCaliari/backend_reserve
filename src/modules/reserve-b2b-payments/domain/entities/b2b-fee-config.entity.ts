export interface B2BFeeConfigProps {
  id: string;
  tenantId: string;
  chipCostPercent: number;
  shippingFee: number;
  createdAt: Date;
  updatedAt: Date;
}

export class B2BFeeConfigEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly chipCostPercent: number;
  readonly shippingFee: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: B2BFeeConfigProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.chipCostPercent = props.chipCostPercent;
    this.shippingFee = props.shippingFee;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
