create unique index if not exists marketing_reward_rule_campaign_unique
on public.marketing_reward_rules(campaign_id,role_key,reward_type)
where campaign_id is not null;