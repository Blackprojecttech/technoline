import mongoose, { Document, Schema } from 'mongoose';

export interface IDeliveryPoint extends Document {
  code: string;
  name: string;
  address: string;
  city: string;
  region: string;
  fias_guid?: string;
  city_code?: string;
  latitude: number;
  longitude: number;
  type: string;
  owner_code?: string;
  is_handout?: boolean;
  is_reception?: boolean;
  is_dressing_room?: boolean;
  have_cashless?: boolean;
  have_cash?: boolean;
  allowed_cod?: boolean;
  work_time?: string;
  phones?: string[];
  email?: string;
  note?: string;
  updatedAt: Date;
}

const deliveryPointSchema = new Schema<IDeliveryPoint>({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  region: { type: String, required: true },
  fias_guid: { type: String },
  city_code: { type: String },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  type: { type: String, required: true },
  owner_code: { type: String },
  is_handout: { type: Boolean },
  is_reception: { type: Boolean },
  is_dressing_room: { type: Boolean },
  have_cashless: { type: Boolean },
  have_cash: { type: Boolean },
  allowed_cod: { type: Boolean },
  work_time: { type: String },
  phones: [{ type: String }],
  email: { type: String },
  note: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

deliveryPointSchema.index({ code: 1 });
deliveryPointSchema.index({ city: 1 });
deliveryPointSchema.index({ city_code: 1 });
deliveryPointSchema.index({ fias_guid: 1 });
deliveryPointSchema.index({ latitude: 1, longitude: 1 });

export const DeliveryPoint = mongoose.model<IDeliveryPoint>('DeliveryPoint', deliveryPointSchema); 