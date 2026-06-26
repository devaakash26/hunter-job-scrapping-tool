import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('jobs')
@Unique(['company', 'title', 'source'])
export class Job {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Index()
  @Column()
  company!: string;

  @Column({ nullable: true })
  location!: string;

  @Column({ nullable: true, default: 'Not mentioned' })
  salary!: string;

  @Column()
  url!: string;

  @Column()
  source!: string;

  @Column({ nullable: true })
  tags!: string;

  @Column({ nullable: true })
  postedAt!: string;

  @Column({ default: false })
  easyApply!: boolean;

  @Column({ nullable: true })
  ycBatch!: string;

  @Column({ default: 'new' })
  status!: string;

  @Column({ default: false })
  alerted!: boolean;

  @Column({ nullable: true })
  appliedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
