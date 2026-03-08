function removerAcentos(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

process.on('message', ({ items, index, aux, values }) => {
    const _value = new Set(items.map(item => {
        const nomeFantasia = item['nome-fantasia_nome-empresarial'];
        if (nomeFantasia) {
            return removerAcentos(nomeFantasia.replaceAll('\r', '').toLocaleLowerCase());
        }
        return '';
    }).filter(nome => nome !== ''));

    const uniqueValues = new Set(values.map(nome => 
        removerAcentos(nome.replaceAll('\r', '').toLocaleLowerCase())
    ));

    const companys = items.filter(item => {
        const nomeFantasia = item['nome-fantasia_nome-empresarial'];

        if (nomeFantasia) {
            const nomeNormalized = removerAcentos(nomeFantasia.replaceAll('\r', '').toLocaleLowerCase());
            return uniqueValues.has(nomeNormalized) && _value.has(nomeNormalized);
        }
        return false;
    });
    
    process.send({
        message: 'item-done',
        num: items.length,
        index: index,
        _companys: companys
    });
});

