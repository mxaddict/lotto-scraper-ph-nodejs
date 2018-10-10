CREATE TABLE results (
  id INTEGER PRIMARY KEY,
  game VARCHAR,
  stamp TIMESTAMP,
  prize INTEGER,
  winners INTEGER
);

CREATE INDEX idx_results_game ON results (game);
CREATE INDEX idx_results_when ON results (stamp);
CREATE INDEX idx_results_prize ON results (prize);
CREATE INDEX idx_results_winners ON results (winners);

CREATE TABLE numbers (
  id INTEGER PRIMARY KEY,
  result_id INTEGER NOT NULL,
  value INTEGER,
  FOREIGN KEY (result_id) REFERENCES results (result_id)
);

CREATE INDEX idx_numbers_value ON numbers (value);

-- Down
DROP TABLE results
