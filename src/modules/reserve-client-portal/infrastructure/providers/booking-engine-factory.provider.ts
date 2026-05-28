import { Injectable } from '@nestjs/common';
import { EBookingEngineType } from '../../domain/enums/reservation.enum';
import { IBookingEngineAdapter } from './booking-engine-adapter.interface';
import { GenericAdapter } from './adapters/generic.adapter';
import { OmnibeesAdapter } from './adapters/omnibees.adapter';
import { StaysAdapter } from './adapters/stays.adapter';
import { FocoAdapter } from './adapters/foco.adapter';

@Injectable()
export class BookingEngineFactory {
  constructor(
    private readonly genericAdapter: GenericAdapter,
    private readonly omnibeesAdapter: OmnibeesAdapter,
    private readonly staysAdapter: StaysAdapter,
    private readonly focoAdapter: FocoAdapter,
  ) {}

  getAdapter(engineType: EBookingEngineType): IBookingEngineAdapter {
    switch (engineType) {
      case EBookingEngineType.OMNIBEES: return this.omnibeesAdapter;
      case EBookingEngineType.STAYS: return this.staysAdapter;
      case EBookingEngineType.FOCO: return this.focoAdapter;
      default: return this.genericAdapter;
    }
  }
}
