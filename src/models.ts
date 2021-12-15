import {
  Entity,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { BaseModel, BaseDateModel } from "./db";

@Entity()
export class ConvertLog extends BaseDateModel {
  @PrimaryColumn({ length: 32 })
  id: string;

  @Column()
  path: string;

  @Column()
  type: string;

  @Column({ nullable: true })
  type_converted: string;

  @Column({ nullable: true })
  width: number;

  @Column({ nullable: true })
  height: number;

  @Column({ nullable: true })
  size: number;

  @Column({ nullable: true })
  quality: string;

  @Column({ nullable: true })
  width_converted: number;

  @Column({ nullable: true })
  height_converted: number;

  @Column({ nullable: true })
  size_converted: number;

  @Column({ nullable: true })
  quality_converted: string;

  // new url
  @Column({ nullable: true })
  result: string;

  @Column({ default: false })
  success: boolean;

  @Column({ nullable: true })
  error: string;
}
