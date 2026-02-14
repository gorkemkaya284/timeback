// DEV MODE: AUTH COMPLETELY DISABLED — REMOVE BEFORE PRODUCTION
// Fixed mock user id used everywhere instead of auth.uid() / session.user.id

export const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export const DEV_USER = {
  id: DEV_USER_ID,
  email: 'dev@localhost',
}
