
-- DROP DATABASE abot;

CREATE DATABASE abot
  WITH OWNER = postgres
       ENCODING = 'UTF8'
       TABLESPACE = pg_default
       LC_COLLATE = 'English_United States.1252'
       LC_CTYPE = 'English_United States.1252'
       CONNECTION LIMIT = -1;
GRANT ALL ON DATABASE abot TO postgres;
GRANT ALL ON DATABASE abot TO joeadmin;
GRANT CONNECT ON DATABASE abot TO joe;
REVOKE ALL ON DATABASE abot FROM public;



COMMENT ON DATABASE abot
  IS 'abot database';