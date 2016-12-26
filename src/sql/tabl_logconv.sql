
/* #userid", "text", "response", "action", "intent", "conversationid",
#"res", "delta" */

CREATE TABLE IF NOT EXISTS logconv (
          id serial primary key,
          ts timestamp default current_timestamp,
          botid varchar(10) not null,
          userid varchar(40) not null,
          message varchar(1024) not null,
          response varchar(1024) not null,
          action varchar(512) not null,
          intent varchar(20) not null,
          conversationid varchar(40) not null,
          delta int not null,
          meta json
);
GRANT ALL ON TABLE logconv TO postgres;
GRANT ALL ON TABLE logconv TO joe;
GRANT USAGE, SELECT ON SEQUENCE logconv_id_seq TO joe;
