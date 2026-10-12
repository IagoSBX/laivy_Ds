-- A foto do exame é guardada em Base64 (até 2 MB de imagem ≈ 2,7 MB de texto); VARCHAR(255) truncava e o cadastro falhava.
ALTER TABLE tbl_exame MODIFY foto_exame MEDIUMTEXT NULL;
