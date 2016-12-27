
-- DROP TABLE users;

CREATE TABLE users
(
  "user" character varying(30),
  email character varying(80),
  pass character varying(128),
  id character varying(60),
  ts timestamp default current_timestamp
)
WITH (
  OIDS=FALSE
);
ALTER TABLE users
  OWNER TO postgres;
GRANT ALL ON TABLE users TO postgres;
GRANT ALL ON TABLE users TO joe;
