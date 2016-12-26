CREATE TABLE session
(
  sid character varying NOT NULL,
  sess json NOT NULL,
  expire timestamp(6) without time zone NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
)
WITH (
  OIDS=FALSE
);
ALTER TABLE session
  OWNER TO postgres;
GRANT ALL ON TABLE session TO postgres;
GRANT ALL ON TABLE session TO joe;