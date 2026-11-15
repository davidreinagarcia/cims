-- Authors can delete their own bulletin posts; moderators can delete any.
create policy bulletin_posts_delete on public.bulletin_posts for delete to authenticated
  using (account_id = auth.uid() or public.app_role() = 'moderator');
