import ModelException from "src/core/exceptions/ModelException";

export default class CPF {
    private cpf: string;

    constructor(cpf: string) {
        if (!this.isValid(cpf)) {
            throw new ModelException('invalid CPF', {
                invalid_value: cpf,
            });
        }

        this.cpf = cpf;
    }

    private isValid(cpf: string): boolean {
        if (!cpf) {
            return false;
        }

        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

        let sum = 0;
        let remainder;

        // Validação do primeiro dígito
        for (let i = 1; i <= 9; i++) {
            sum += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(9, 10), 10)) return false;

        // Validação do segundo dígito
        sum = 0;
        for (let i = 1; i <= 10; i++) {
            sum += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;

        return remainder === parseInt(cpf.substring(10, 11), 10);
    }

    public toString(): string {
        return this.cpf;
    }
}
