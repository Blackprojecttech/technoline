import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  ymlId?: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: mongoose.Types.ObjectId;
  isActive: boolean;
  sortOrder: number;
  characteristicGroupIds?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>({
  ymlId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: [true, 'Название категории обязательно'],
    trim: true,
    maxlength: [100, 'Название категории не может быть длиннее 100 символов']
  },
  slug: {
    type: String,
    required: [true, 'Slug обязателен'],
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'Описание не может быть длиннее 500 символов']
  },
  image: {
    type: String,
    default: ''
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  characteristicGroupIds: [{
    type: Schema.Types.ObjectId,
    ref: 'CharacteristicGroup',
    default: []
  }]
}, {
  timestamps: true
});

// Indexes
categorySchema.index({ ymlId: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ isActive: 1, sortOrder: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema); 