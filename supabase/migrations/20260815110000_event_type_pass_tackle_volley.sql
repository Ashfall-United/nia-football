-- Common on-ball actions missing from the original event_type enum.

alter type public.event_type add value if not exists 'pass';
alter type public.event_type add value if not exists 'tackle';
alter type public.event_type add value if not exists 'volley';
