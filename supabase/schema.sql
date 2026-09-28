create table if not exists employees (
  slug text primary key,
  name text not null,
  role text not null check (role in ('manager','salesperson','expense_reporter')),
  telegram_user_id text unique,
  telegram_chat_id text
);

insert into employees(slug,name,role) values
('svetlana','Svetlana de Monte Carlo','manager'),
('richard','Richard Darling','salesperson'),
('anastasia','Anastasia Ferrari','salesperson'),
('jean-claude','Jean-Claude Bērziņš','salesperson'),
('kevin','Kevin von Whatever','expense_reporter')
on conflict (slug) do update set name=excluded.name, role=excluded.role;

create table if not exists sales (
  reference text primary key,
  submitted_at timestamptz not null default now(),
  salesperson text not null references employees(slug),
  originating_chat_id text,
  customer text not null,
  project text not null check (project in ('A','B')),
  description text not null,
  amount_cents bigint not null check (amount_cents > 0),
  proposed_richard_pct integer not null check (proposed_richard_pct between 0 and 100),
  proposed_anastasia_pct integer not null check (proposed_anastasia_pct between 0 and 100),
  proposed_jean_claude_pct integer not null check (proposed_jean_claude_pct between 0 and 100),
  approved_richard_pct integer,
  approved_anastasia_pct integer,
  approved_jean_claude_pct integer,
  richard_commission_cents bigint not null default 0,
  anastasia_commission_cents bigint not null default 0,
  jean_claude_commission_cents bigint not null default 0,
  commission_pool_cents bigint not null default 0,
  status text not null default 'Pending approval' check (status in ('Pending approval','Approved')),
  approved_at timestamptz,
  decision_changed boolean not null default false,
  sheet_sync_status text not null default 'pending' check (sheet_sync_status in ('pending','synced','failed')),
  sheet_sync_error text,
  notification_status text not null default 'not_required' check (notification_status in ('not_required','pending','sent','failed')),
  notification_error text,
  check (proposed_richard_pct + proposed_anastasia_pct + proposed_jean_claude_pct = 100),
  check (approved_richard_pct is null or approved_richard_pct + approved_anastasia_pct + approved_jean_claude_pct = 100)
);

create table if not exists expenses (
  reference text primary key,
  submitted_at timestamptz not null default now(),
  reporter text not null references employees(slug),
  originating_chat_id text,
  description text not null,
  category text not null check (category in ('Materials','Travel','Other')),
  amount_cents bigint not null check (amount_cents > 0),
  proposed_allocation text not null check (proposed_allocation in ('A','B','Company overhead')),
  final_allocation text check (final_allocation in ('A','B','Company overhead')),
  status text not null check (status in ('Awaiting allocation','Allocated')),
  allocated_at timestamptz,
  decision_changed boolean not null default false,
  sheet_sync_status text not null default 'pending' check (sheet_sync_status in ('pending','synced','failed')),
  sheet_sync_error text,
  notification_status text not null default 'not_required' check (notification_status in ('not_required','pending','sent','failed')),
  notification_error text
);

alter table employees enable row level security;
alter table sales enable row level security;
alter table expenses enable row level security;
-- No browser policies are created. The secret server key is used only inside Vercel route handlers.

