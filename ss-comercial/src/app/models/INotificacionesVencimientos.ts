export interface IMesesVencimientos {
    numeroMes: number;
    nombreMes: string;
}

export interface INotificacionesVencimientos {
    nmAseg: string;
    nmRamo: string;
    cliente: string;
    fcDesde: Date;
    fcHasta: Date;
    poliza: string;
    ramo: string;
    totValAseg: number;
    totPrima: number;
    telefonos: string;
    correo: string;
    dscObjeto: string;
    area: string;
    subarea: string;
}

export interface IResponse {
    esError: boolean;
    mensaje: string;
    resultado: any;
}

export interface IRegistroNotificacionesVencimientos {
    email: string;
    mes: string;
    cliente: string;
    subarea: string;
    nmRamo: string;
    nmAseg: string;
    poliza: string;
    totValAsegFormat: string;
    vigenciaDesdeFormat: string;
    vigenciaHastaFormat: string;
    dscObjeto: string;
}