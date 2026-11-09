process.env.NODE_ENV = 'test'
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://workout_tracker:workout_tracker_dev@127.0.0.1:5432/workout_tracker_test'
process.env.TEST_DATABASE_URL = process.env.DATABASE_URL
process.env.SWAGGER_ENABLED = 'false'
delete process.env.WEB_DIST_DIR
