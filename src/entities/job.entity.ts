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

  @Index()
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

  @Index()
  @Column({ default: 'new' })
  status!: string;

  @Column({ default: false })
  alerted!: boolean;

  @Column({ nullable: true })
  appliedAt!: Date;

  // Indexed — the dashboard list always sorts by it.
  @Index()
  @CreateDateColumn()
  createdAt!: Date;
}
