export interface B2CFeeConfigProps {
  id: string;
  tenantId: string;
  chipCostPercent: number; // % global (ex: 2.5 = 2.5%)
  shippingFee: number;     // frete fixo global em centavos
  createdAt: Date;
  updatedAt: Date;
}

export class B2CFeeConfigEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly chipCostPercent: number;
  readonly shippingFee: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: B2CFeeConfigProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.chipCostPercent = props.chipCostPercent;
    this.shippingFee = props.shippingFee;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
